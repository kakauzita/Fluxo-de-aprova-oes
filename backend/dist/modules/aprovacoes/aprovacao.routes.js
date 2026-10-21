"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aprovacaoRoutes = aprovacaoRoutes;
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const permissions_1 = require("../../lib/permissions");
const errors_1 = require("../../lib/errors");
const consolidation_1 = require("../../shared/consolidation");
async function aprovacaoRoutes(app) {
    const aprovadorOnly = { preHandler: [app.authenticate, (0, permissions_1.requirePerfil)('APROVADOR')] };
    // GET /aprovacoes/pendentes — Lista versões onde o aprovador tem voto pendente
    app.get('/aprovacoes/pendentes', aprovadorOnly, async (req) => {
        const user = req.user;
        // Grupos dos quais o aprovador é membro (via usuário direto ou via unidade)
        const gruposDoAprovador = await prisma_1.prisma.grupoUsuario.findMany({
            where: { usuarioId: user.id },
            select: { grupoId: true },
        });
        const grupoIds = gruposDoAprovador.map((g) => g.grupoId);
        // VersaoGrupos onde o aprovador tem participação e ainda não há manifestação
        const versaoGruposPendentes = await prisma_1.prisma.versaoGrupo.findMany({
            where: {
                grupoId: { in: grupoIds },
                versaoPeca: { status: 'PENDENTE' },
                // Sem manifestação ainda
                NOT: {
                    versaoPecaId: {
                        in: (await prisma_1.prisma.manifestacaoGrupo.findMany({
                            where: { grupoId: { in: grupoIds } },
                            select: { versaoPecaId: true },
                        })).map((m) => m.versaoPecaId),
                    },
                },
            },
            include: {
                versaoPeca: {
                    include: {
                        peca: {
                            include: { publicoAlvo: true, segmento: true, assunto: true, solicitante: { select: { id: true, nome: true } } },
                        },
                        versaoGrupos: { include: { grupo: true } },
                        unidadesAdicionais: true,
                        manifestacoes: {
                            include: {
                                representadoPor: { select: { id: true, codigo: true, nome: true } },
                                grupo: { select: { id: true, nome: true } },
                            },
                        },
                    },
                },
                grupo: true,
            },
        });
        return versaoGruposPendentes;
    });
    // POST /aprovacoes/:versaoId/votar — Registra aprovação ou reprovação (RN-01, RN-02, RN-03)
    app.post('/aprovacoes/:versaoId/votar', aprovadorOnly, async (req) => {
        const { versaoId } = req.params;
        const user = req.user;
        const body = zod_1.z
            .object({
            decisao: zod_1.z.enum(['APROVADO', 'REPROVADO']),
            justificativa: zod_1.z.string().optional(),
            unidadeAdicionalId: zod_1.z.string().uuid().optional(), // se votando como unidade adicional
        })
            .parse(req.body);
        // Valida justificativa obrigatória (RN-03)
        if (body.decisao === 'REPROVADO' && !body.justificativa?.trim()) {
            throw new errors_1.UnprocessableError('Justificativa é obrigatória para reprovação. (RN-03)');
        }
        const versao = await prisma_1.prisma.versaoPeca.findUnique({
            where: { id: versaoId },
            include: { peca: true },
        });
        if (!versao)
            throw new errors_1.NotFoundError('Versão da Peça', versaoId);
        if (versao.status !== 'PENDENTE') {
            throw new errors_1.UnprocessableError('Esta versão já foi consolidada e não aceita mais votos.');
        }
        // --- Resolução do grupo do aprovador (RN-01) ---
        let grupoId = null;
        if (body.unidadeAdicionalId) {
            // Voto em nome de unidade adicional
            const ua = await prisma_1.prisma.unidadeAdicional.findUnique({ where: { id: body.unidadeAdicionalId } });
            if (!ua || ua.versaoPecaId !== versaoId) {
                throw new errors_1.NotFoundError('Unidade Adicional', body.unidadeAdicionalId);
            }
            // Verifica bloqueio (RN-02)
            const jaVotou = await prisma_1.prisma.manifestacaoGrupo.findUnique({
                where: { unidadeAdicionalId: body.unidadeAdicionalId },
            });
            if (jaVotou)
                throw new errors_1.UnprocessableError('Esta unidade adicional já manifestou nesta versão. (RN-02)');
        }
        else {
            // Voto em nome de grupo
            const grupoDoUsuario = await resolverGrupoNaVersao(versaoId, user.id);
            if (!grupoDoUsuario) {
                throw new errors_1.ForbiddenError('Você não pertence a nenhum grupo com voto pendente nesta versão.');
            }
            // Verifica bloqueio do grupo (RN-02)
            const jaVotou = await prisma_1.prisma.manifestacaoGrupo.findUnique({
                where: { versaoPecaId_grupoId: { versaoPecaId: versaoId, grupoId: grupoDoUsuario } },
            });
            if (jaVotou)
                throw new errors_1.UnprocessableError('Seu grupo já manifestou nesta versão. (RN-02)');
            grupoId = grupoDoUsuario;
        }
        // Resolve informações do usuário para auditoria (RN-15)
        const userInfo = await prisma_1.prisma.usuario.findUnique({ where: { id: user.id } });
        await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Registra manifestação (RN-01 — primeira manifestação representa o grupo)
            await tx.manifestacaoGrupo.create({
                data: {
                    versaoPecaId: versaoId,
                    grupoId: grupoId,
                    unidadeAdicionalId: body.unidadeAdicionalId ?? null,
                    representadoPorId: user.id,
                    decisao: body.decisao,
                    justificativa: body.justificativa ?? null,
                },
            });
            // 2. Audit log (RN-15)
            await tx.eventoHistorico.create({
                data: {
                    pecaId: versao.pecaId,
                    versaoPecaId: versaoId,
                    usuarioId: user.id,
                    codigoUsuario: userInfo?.codigo,
                    nomeUsuario: userInfo?.nome,
                    evento: body.decisao === 'APROVADO' ? 'GRUPO_APROVADO' : 'GRUPO_REPROVADO',
                    payload: {
                        decisao: body.decisao,
                        justificativa: body.justificativa,
                        grupoId,
                        unidadeAdicionalId: body.unidadeAdicionalId,
                    },
                },
            });
            // 3. Tenta consolidar (RN-04 — somente quando todos votaram)
            await (0, consolidation_1.consolidar)(versaoId, tx);
        });
        return { ok: true, mensagem: `Voto '${body.decisao}' registrado com sucesso.` };
    });
    // GET /aprovacoes/historico/:versaoId — Histórico de votos de uma versão
    app.get('/aprovacoes/historico/:versaoId', { preHandler: [app.authenticate] }, async (req) => {
        const { versaoId } = req.params;
        return prisma_1.prisma.manifestacaoGrupo.findMany({
            where: { versaoPecaId: versaoId },
            include: {
                representadoPor: { select: { id: true, codigo: true, nome: true } },
                grupo: { select: { id: true, nome: true } },
                unidadeAdicional: true,
            },
            orderBy: { manifestadoEm: 'asc' },
        });
    });
}
/**
 * Resolve o grupo ao qual o aprovador pertence dentro de uma versão específica.
 * Verifica tanto membros diretos (GrupoUsuario) quando membros via Unidade.
 */
async function resolverGrupoNaVersao(versaoPecaId, usuarioId) {
    const versaoGrupos = await prisma_1.prisma.versaoGrupo.findMany({
        where: { versaoPecaId },
        select: { grupoId: true },
    });
    for (const { grupoId } of versaoGrupos) {
        // Membro direto
        const membroDireto = await prisma_1.prisma.grupoUsuario.findUnique({
            where: { grupoId_usuarioId: { grupoId, usuarioId } },
        });
        if (membroDireto)
            return grupoId;
        // Membro via unidade vinculada ao grupo
        const usuario = await prisma_1.prisma.usuario.findUnique({ where: { id: usuarioId } });
        if (!usuario)
            continue;
        // Busca unidades do grupo → verifica se o aprovador pertence
        const grupoUnidades = await prisma_1.prisma.grupoUnidade.findMany({
            where: { grupoId },
            include: { unidade: true },
        });
        // Verificação simulada: aprovador pode ser associado a uma unidade via código
        for (const gu of grupoUnidades) {
            if (gu.unidade.codigo === usuario.codigo)
                return grupoId;
        }
    }
    return null;
}
//# sourceMappingURL=aprovacao.routes.js.map