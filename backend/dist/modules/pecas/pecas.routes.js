"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pecasRoutes = pecasRoutes;
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const permissions_1 = require("../../lib/permissions");
const errors_1 = require("../../lib/errors");
const grupo_calculator_1 = require("../../shared/grupo-calculator");
const conteudo_schemas_1 = require("../../lib/conteudo-schemas");
const unit_api_1 = require("../../lib/unit-api");
async function pecasRoutes(app) {
    const solicitanteOnly = { preHandler: [app.authenticate, (0, permissions_1.requirePerfil)('SOLICITANTE')] };
    const autenticado = { preHandler: [app.authenticate] };
    // GET /pecas/grupos-preview?segmentoId=&assuntoId= — Preview sem pecaId
    app.get('/pecas/grupos-preview', { preHandler: [app.authenticate] }, async (req) => {
        const { segmentoId, assuntoId } = req.query;
        if (!segmentoId || !assuntoId)
            return [];
        return (0, grupo_calculator_1.calcularGruposDaVersao)(segmentoId, assuntoId);
    });
    // GET /pecas — Lista peças do solicitante logado
    app.get('/pecas', solicitanteOnly, async (req) => {
        const user = req.user;
        const { status, excludeStatus } = req.query;
        const where = { solicitanteId: user.id };
        if (status) {
            where.status = status;
        }
        else if (excludeStatus) {
            where.status = { not: excludeStatus };
        }
        return prisma_1.prisma.peca.findMany({
            where,
            include: {
                publicoAlvo: true,
                segmento: true,
                assunto: true,
                versoes: {
                    orderBy: { numeroVersao: 'desc' },
                    take: 1,
                    include: {
                        versaoGrupos: { include: { grupo: true } },
                        manifestacoes: true,
                    }
                },
            },
            orderBy: { atualizadoEm: 'desc' },
        });
    });
    // DELETE /pecas/:id — Exclui peça (somente RASCUNHO)
    app.delete('/pecas/:id', solicitanteOnly, async (req, reply) => {
        const { id } = req.params;
        const user = req.user;
        const peca = await prisma_1.prisma.peca.findUnique({ where: { id } });
        if (!peca)
            throw new errors_1.NotFoundError('Peça', id);
        if (peca.solicitanteId !== user.id)
            throw new errors_1.ForbiddenError();
        if (peca.status !== 'RASCUNHO') {
            throw new errors_1.UnprocessableError('Apenas peças em RASCUNHO podem ser excluídas.');
        }
        await prisma_1.prisma.$transaction(async (tx) => {
            const versoes = await tx.versaoPeca.findMany({ where: { pecaId: id }, select: { id: true } });
            const versaoIds = versoes.map(v => v.id);
            if (versaoIds.length > 0) {
                await tx.manifestacaoGrupo.deleteMany({ where: { versaoPecaId: { in: versaoIds } } });
                await tx.unidadeAdicional.deleteMany({ where: { versaoPecaId: { in: versaoIds } } });
                await tx.versaoGrupo.deleteMany({ where: { versaoPecaId: { in: versaoIds } } });
                await tx.versaoPeca.deleteMany({ where: { pecaId: id } });
            }
            await tx.eventoHistorico.deleteMany({ where: { pecaId: id } });
            await tx.peca.delete({ where: { id } });
        });
        return reply.status(204).send();
    });
    // GET /pecas/:id — Detalhe completo da peça
    app.get('/pecas/:id', autenticado, async (req) => {
        const { id } = req.params;
        const user = req.user;
        const peca = await prisma_1.prisma.peca.findUnique({
            where: { id },
            include: {
                publicoAlvo: true,
                segmento: { include: { segmentoGrupos: { include: { grupo: true } } } },
                assunto: { include: { assuntoGrupos: { include: { grupo: true } } } },
                versoes: {
                    orderBy: { numeroVersao: 'asc' },
                    include: {
                        versaoGrupos: { include: { grupo: true } },
                        unidadesAdicionais: true,
                        manifestacoes: {
                            include: {
                                representadoPor: { select: { id: true, codigo: true, nome: true } },
                                grupo: { select: { id: true, nome: true } },
                                unidadeAdicional: true,
                            },
                        },
                    },
                },
                eventos: { orderBy: { ocorridoEm: 'asc' } },
            },
        });
        if (!peca)
            throw new errors_1.NotFoundError('Peça', id);
        // Solicitante só vê as próprias peças
        if (user.perfil === 'SOLICITANTE' && peca.solicitanteId !== user.id) {
            throw new errors_1.ForbiddenError();
        }
        return peca;
    });
    // POST /pecas — Cria peça em RASCUNHO
    app.post('/pecas', solicitanteOnly, async (req, reply) => {
        const user = req.user;
        const body = zod_1.z
            .object({
            nome: zod_1.z.string().min(1),
            descricao: zod_1.z.string().optional(),
            canal: zod_1.z.enum(['SMS', 'PUSH', 'WHATSAPP', 'EMAIL', 'BANNER_APP']),
            publicoAlvoId: zod_1.z.string().uuid(),
            segmentoId: zod_1.z.string().uuid(),
            assuntoId: zod_1.z.string().uuid(),
        })
            .parse(req.body);
        const [pa, seg, ass] = await Promise.all([
            prisma_1.prisma.publicoAlvo.findUnique({ where: { id: body.publicoAlvoId } }),
            prisma_1.prisma.segmento.findUnique({ where: { id: body.segmentoId } }),
            prisma_1.prisma.assunto.findUnique({ where: { id: body.assuntoId } }),
        ]);
        if (!pa)
            throw new errors_1.NotFoundError('Público Alvo', body.publicoAlvoId);
        if (!seg)
            throw new errors_1.NotFoundError('Segmento', body.segmentoId);
        if (!ass)
            throw new errors_1.NotFoundError('Assunto', body.assuntoId);
        if (seg.publicoAlvoId !== body.publicoAlvoId) {
            throw new errors_1.UnprocessableError('Segmento não pertence ao Público Alvo selecionado.');
        }
        const peca = await prisma_1.prisma.peca.create({
            data: { ...body, solicitanteId: user.id, status: 'RASCUNHO' },
        });
        await prisma_1.prisma.eventoHistorico.create({
            data: { pecaId: peca.id, usuarioId: user.id, evento: 'PECA_CRIADA' },
        });
        return reply.status(201).send(peca);
    });
    // PATCH /pecas/:id — Edita peça (somente RASCUNHO ou REPROVADA — RN-13)
    app.patch('/pecas/:id', solicitanteOnly, async (req) => {
        const { id } = req.params;
        const user = req.user;
        const peca = await prisma_1.prisma.peca.findUnique({ where: { id } });
        if (!peca)
            throw new errors_1.NotFoundError('Peça', id);
        if (peca.solicitanteId !== user.id)
            throw new errors_1.ForbiddenError();
        if (!['RASCUNHO', 'REPROVADA'].includes(peca.status)) {
            throw new errors_1.UnprocessableError('Peça só pode ser editada em RASCUNHO ou REPROVADA. (RN-13)');
        }
        const body = zod_1.z
            .object({
            nome: zod_1.z.string().min(1).optional(),
            descricao: zod_1.z.string().optional(),
            canal: zod_1.z.enum(['SMS', 'PUSH', 'WHATSAPP', 'EMAIL', 'BANNER_APP']).optional(),
            publicoAlvoId: zod_1.z.string().uuid().optional(),
            segmentoId: zod_1.z.string().uuid().optional(),
            assuntoId: zod_1.z.string().uuid().optional(),
            conteudo: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        })
            .parse(req.body);
        const { conteudo, ...pecaData } = body;
        const updated = await prisma_1.prisma.peca.update({ where: { id }, data: pecaData });
        if (conteudo) {
            const ultimaVersao = await prisma_1.prisma.versaoPeca.findFirst({
                where: { pecaId: id },
                orderBy: { numeroVersao: 'desc' },
            });
            if (ultimaVersao) {
                await prisma_1.prisma.versaoPeca.update({
                    where: { id: ultimaVersao.id },
                    data: { conteudo: conteudo },
                });
            }
            else {
                await prisma_1.prisma.versaoPeca.create({
                    data: {
                        pecaId: id,
                        numeroVersao: 1,
                        conteudo: conteudo,
                        status: 'PENDENTE',
                    },
                });
            }
        }
        await prisma_1.prisma.eventoHistorico.create({
            data: { pecaId: id, usuarioId: user.id, evento: 'PECA_EDITADA' },
        });
        return updated;
    });
    // GET /pecas/:id/grupos-calculados — Preview dos grupos antes de submeter
    app.get('/pecas/:id/grupos-calculados', solicitanteOnly, async (req) => {
        const { id } = req.params;
        const peca = await prisma_1.prisma.peca.findUnique({ where: { id } });
        if (!peca)
            throw new errors_1.NotFoundError('Peça', id);
        return (0, grupo_calculator_1.calcularGruposDaVersao)(peca.segmentoId, peca.assuntoId);
    });
    // POST /pecas/:id/unidades-extras — Adiciona unidade extra (RN-12)
    app.post('/pecas/:id/unidades-extras', solicitanteOnly, async (req, reply) => {
        const { id } = req.params;
        const user = req.user;
        const { codigo } = zod_1.z.object({ codigo: zod_1.z.string() }).parse(req.body);
        const peca = await prisma_1.prisma.peca.findUnique({ where: { id }, include: { versoes: { orderBy: { numeroVersao: 'desc' }, take: 1 } } });
        if (!peca)
            throw new errors_1.NotFoundError('Peça', id);
        if (peca.solicitanteId !== user.id)
            throw new errors_1.ForbiddenError();
        if (!['RASCUNHO', 'REPROVADA'].includes(peca.status)) {
            throw new errors_1.UnprocessableError('Unidades extras só podem ser adicionadas em peças editáveis.');
        }
        const unidadeInfo = await (0, unit_api_1.validarUnidade)(codigo);
        if (!unidadeInfo)
            throw new errors_1.AppError(`Código de unidade '${codigo}' inválido. (RN-16)`, 400);
        // Unidade extra é armazenada na versão mais recente, ou será criada na submissão.
        // Para rascunhos sem versão ainda, armazenamos na peça via campo temporário no histórico.
        // Na submissão, unidades extras pendentes são copiadas para a nova VersaoPeca.
        // Aqui, armazenamos a intenção no evento para ser resolvida na submissão.
        await prisma_1.prisma.eventoHistorico.create({
            data: {
                pecaId: id,
                usuarioId: user.id,
                evento: 'PECA_EDITADA',
                payload: { acao: 'UNIDADE_EXTRA_ADICIONADA', unidade: unidadeInfo },
            },
        });
        return reply.status(201).send(unidadeInfo);
    });
    // POST /pecas/:id/submeter — Envia para aprovação (RN-07, submissão gera nova VersaoPeca)
    app.post('/pecas/:id/submeter', solicitanteOnly, async (req, reply) => {
        const { id } = req.params;
        const user = req.user;
        const body = zod_1.z
            .object({
            conteudo: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
            unidadesExtras: zod_1.z.array(zod_1.z.object({ codigo: zod_1.z.string(), nome: zod_1.z.string() })).default([]),
        })
            .parse(req.body);
        const peca = await prisma_1.prisma.peca.findUnique({ where: { id } });
        if (!peca)
            throw new errors_1.NotFoundError('Peça', id);
        if (peca.solicitanteId !== user.id)
            throw new errors_1.ForbiddenError();
        if (!['RASCUNHO', 'REPROVADA'].includes(peca.status)) {
            throw new errors_1.UnprocessableError('Somente peças em RASCUNHO ou REPROVADA podem ser submetidas.');
        }
        // Valida conteúdo conforme canal (schema Zod por canal)
        const conteudoSchema = (0, conteudo_schemas_1.getConteudoSchema)(peca.canal);
        const conteudoParseado = conteudoSchema.parse(body.conteudo);
        // Calcula grupos (dedup — RN-08)
        const grupos = await (0, grupo_calculator_1.calcularGruposDaVersao)(peca.segmentoId, peca.assuntoId);
        if (grupos.length === 0 && body.unidadesExtras.length === 0) {
            throw new errors_1.UnprocessableError('Não há grupos nem unidades extras para aprovação.');
        }
        const versao = await prisma_1.prisma.$transaction(async (tx) => {
            // Número da próxima versão (RN-07)
            const ultimaVersao = await tx.versaoPeca.findFirst({
                where: { pecaId: id },
                orderBy: { numeroVersao: 'desc' },
            });
            const proximoNumero = (ultimaVersao?.numeroVersao ?? 0) + 1;
            // Cria VersaoPeca imutável
            const v = await tx.versaoPeca.create({
                data: { pecaId: id, numeroVersao: proximoNumero, conteudo: conteudoParseado, status: 'PENDENTE' },
            });
            // Snapshot dos grupos (RN-07 — imutável)
            await tx.versaoGrupo.createMany({
                data: grupos.map((g) => ({ versaoPecaId: v.id, grupoId: g.id, origem: g.origem })),
            });
            // Unidades adicionais (RN-12)
            if (body.unidadesExtras.length > 0) {
                await tx.unidadeAdicional.createMany({
                    data: body.unidadesExtras.map((u) => ({ versaoPecaId: v.id, codigo: u.codigo, nome: u.nome })),
                });
            }
            // Muda status da peça (RN-13)
            await tx.peca.update({ where: { id }, data: { status: 'AGUARDANDO_APROVACAO' } });
            // Evento de auditoria
            await tx.eventoHistorico.create({
                data: { pecaId: id, versaoPecaId: v.id, usuarioId: user.id, evento: 'PECA_SUBMETIDA' },
            });
            return v;
        });
        return reply.status(201).send(versao);
    });
}
//# sourceMappingURL=pecas.routes.js.map