import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requirePerfil } from '../../lib/permissions'
import { ForbiddenError, NotFoundError, UnprocessableError, AppError } from '../../lib/errors'
import { calcularGruposDaVersao } from '../../shared/grupo-calculator'
import { getConteudoSchema } from '../../lib/conteudo-schemas'
import { validarUnidade } from '../../lib/unit-api'
import { Prisma } from '@prisma/client'

type CanalTipo = 'SMS' | 'PUSH' | 'WHATSAPP' | 'EMAIL' | 'BANNER_APP'

export async function pecasRoutes(app: FastifyInstance) {
    const solicitanteOnly = { preHandler: [app.authenticate, requirePerfil('SOLICITANTE')] }
    const autenticado = { preHandler: [app.authenticate] }

    // GET /pecas/grupos-preview?segmentoId=&assuntoId= — Preview sem pecaId
    app.get('/pecas/grupos-preview', { preHandler: [app.authenticate] }, async (req) => {
        const { segmentoId, assuntoId } = req.query as { segmentoId?: string; assuntoId?: string }
        if (!segmentoId || !assuntoId) return []
        return calcularGruposDaVersao(segmentoId, assuntoId)
    })

    // GET /pecas — Lista peças do solicitante logado
    app.get('/pecas', solicitanteOnly, async (req) => {
        const user = (req as any).user as { id: string }
        const { status, excludeStatus } = req.query as { status?: string; excludeStatus?: string }

        const where: Prisma.PecaWhereInput = { solicitanteId: user.id }
        if (status) {
            where.status = status as any
        } else if (excludeStatus) {
            where.status = { not: excludeStatus as any }
        }

        return prisma.peca.findMany({
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
        })
    })

    // DELETE /pecas/:id — Exclui peça (somente RASCUNHO)
    app.delete('/pecas/:id', solicitanteOnly, async (req, reply) => {
        const { id } = req.params as { id: string }
        const user = (req as any).user as { id: string }

        const peca = await prisma.peca.findUnique({ where: { id } })
        if (!peca) throw new NotFoundError('Peça', id)
        if (peca.solicitanteId !== user.id) throw new ForbiddenError()
        if (peca.status !== 'RASCUNHO') {
            throw new UnprocessableError('Apenas peças em RASCUNHO podem ser excluídas.')
        }

        await prisma.$transaction(async (tx) => {
            const versoes = await tx.versaoPeca.findMany({ where: { pecaId: id }, select: { id: true } })
            const versaoIds = versoes.map(v => v.id)
            if (versaoIds.length > 0) {
                await tx.manifestacaoGrupo.deleteMany({ where: { versaoPecaId: { in: versaoIds } } })
                await tx.unidadeAdicional.deleteMany({ where: { versaoPecaId: { in: versaoIds } } })
                await tx.versaoGrupo.deleteMany({ where: { versaoPecaId: { in: versaoIds } } })
                await tx.versaoPeca.deleteMany({ where: { pecaId: id } })
            }
            await tx.eventoHistorico.deleteMany({ where: { pecaId: id } })
            await tx.peca.delete({ where: { id } })
        })

        return reply.status(204).send()
    })

    // GET /pecas/:id — Detalhe completo da peça
    app.get('/pecas/:id', autenticado, async (req) => {
        const { id } = req.params as { id: string }
        const user = (req as any).user as { id: string; perfil: string }

        const peca = await prisma.peca.findUnique({
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
        })

        if (!peca) throw new NotFoundError('Peça', id)

        // Solicitante só vê as próprias peças
        if (user.perfil === 'SOLICITANTE' && peca.solicitanteId !== user.id) {
            throw new ForbiddenError()
        }

        return peca
    })

    // POST /pecas — Cria peça em RASCUNHO
    app.post('/pecas', solicitanteOnly, async (req, reply) => {
        const user = (req as any).user as { id: string }

        const body = z
            .object({
                nome: z.string().min(1),
                descricao: z.string().optional(),
                canal: z.enum(['SMS', 'PUSH', 'WHATSAPP', 'EMAIL', 'BANNER_APP']),
                publicoAlvoId: z.string().uuid(),
                segmentoId: z.string().uuid(),
                assuntoId: z.string().uuid(),
            })
            .parse(req.body)

        const [pa, seg, ass] = await Promise.all([
            prisma.publicoAlvo.findUnique({ where: { id: body.publicoAlvoId } }),
            prisma.segmento.findUnique({ where: { id: body.segmentoId } }),
            prisma.assunto.findUnique({ where: { id: body.assuntoId } }),
        ])

        if (!pa) throw new NotFoundError('Público Alvo', body.publicoAlvoId)
        if (!seg) throw new NotFoundError('Segmento', body.segmentoId)
        if (!ass) throw new NotFoundError('Assunto', body.assuntoId)
        if (seg.publicoAlvoId !== body.publicoAlvoId) {
            throw new UnprocessableError('Segmento não pertence ao Público Alvo selecionado.')
        }

        const peca = await prisma.peca.create({
            data: { ...body, solicitanteId: user.id, status: 'RASCUNHO' },
        })

        await prisma.eventoHistorico.create({
            data: { pecaId: peca.id, usuarioId: user.id, evento: 'PECA_CRIADA' },
        })

        return reply.status(201).send(peca)
    })

    // PATCH /pecas/:id — Edita peça (somente RASCUNHO ou REPROVADA — RN-13)
    app.patch('/pecas/:id', solicitanteOnly, async (req) => {
        const { id } = req.params as { id: string }
        const user = (req as any).user as { id: string }

        const peca = await prisma.peca.findUnique({ where: { id } })
        if (!peca) throw new NotFoundError('Peça', id)
        if (peca.solicitanteId !== user.id) throw new ForbiddenError()
        if (!['RASCUNHO', 'REPROVADA'].includes(peca.status)) {
            throw new UnprocessableError('Peça só pode ser editada em RASCUNHO ou REPROVADA. (RN-13)')
        }

        const body = z
            .object({
                nome: z.string().min(1).optional(),
                descricao: z.string().optional(),
                canal: z.enum(['SMS', 'PUSH', 'WHATSAPP', 'EMAIL', 'BANNER_APP']).optional(),
                publicoAlvoId: z.string().uuid().optional(),
                segmentoId: z.string().uuid().optional(),
                assuntoId: z.string().uuid().optional(),
                conteudo: z.record(z.string(), z.unknown()).optional(),
            })
            .parse(req.body)

        const { conteudo, ...pecaData } = body

        const updated = await prisma.peca.update({ where: { id }, data: pecaData })

        if (conteudo) {
            const ultimaVersao = await prisma.versaoPeca.findFirst({
                where: { pecaId: id },
                orderBy: { numeroVersao: 'desc' },
            })
            if (ultimaVersao) {
                await prisma.versaoPeca.update({
                    where: { id: ultimaVersao.id },
                    data: { conteudo: conteudo as any },
                })
            } else {
                await prisma.versaoPeca.create({
                    data: {
                        pecaId: id,
                        numeroVersao: 1,
                        conteudo: conteudo as any,
                        status: 'PENDENTE',
                    },
                })
            }
        }

        await prisma.eventoHistorico.create({
            data: { pecaId: id, usuarioId: user.id, evento: 'PECA_EDITADA' },
        })

        return updated
    })

    // GET /pecas/:id/grupos-calculados — Preview dos grupos antes de submeter
    app.get('/pecas/:id/grupos-calculados', solicitanteOnly, async (req) => {
        const { id } = req.params as { id: string }
        const peca = await prisma.peca.findUnique({ where: { id } })
        if (!peca) throw new NotFoundError('Peça', id)

        return calcularGruposDaVersao(peca.segmentoId, peca.assuntoId)
    })

    // POST /pecas/:id/unidades-extras — Adiciona unidade extra (RN-12)
    app.post('/pecas/:id/unidades-extras', solicitanteOnly, async (req, reply) => {
        const { id } = req.params as { id: string }
        const user = (req as any).user as { id: string }
        const { codigo } = z.object({ codigo: z.string() }).parse(req.body)

        const peca = await prisma.peca.findUnique({ where: { id }, include: { versoes: { orderBy: { numeroVersao: 'desc' }, take: 1 } } })
        if (!peca) throw new NotFoundError('Peça', id)
        if (peca.solicitanteId !== user.id) throw new ForbiddenError()
        if (!['RASCUNHO', 'REPROVADA'].includes(peca.status)) {
            throw new UnprocessableError('Unidades extras só podem ser adicionadas em peças editáveis.')
        }

        const unidadeInfo = await validarUnidade(codigo)
        if (!unidadeInfo) throw new AppError(`Código de unidade '${codigo}' inválido. (RN-16)`, 400)

        // Unidade extra é armazenada na versão mais recente, ou será criada na submissão.
        // Para rascunhos sem versão ainda, armazenamos na peça via campo temporário no histórico.
        // Na submissão, unidades extras pendentes são copiadas para a nova VersaoPeca.
        // Aqui, armazenamos a intenção no evento para ser resolvida na submissão.
        await prisma.eventoHistorico.create({
            data: {
                pecaId: id,
                usuarioId: user.id,
                evento: 'PECA_EDITADA',
                payload: { acao: 'UNIDADE_EXTRA_ADICIONADA', unidade: unidadeInfo } as any,
            },
        })

        return reply.status(201).send(unidadeInfo)
    })

    // POST /pecas/:id/submeter — Envia para aprovação (RN-07, submissão gera nova VersaoPeca)
    app.post('/pecas/:id/submeter', solicitanteOnly, async (req, reply) => {
        const { id } = req.params as { id: string }
        const user = (req as any).user as { id: string }

        const body = z
            .object({
                conteudo: z.record(z.string(), z.unknown()),
                unidadesExtras: z.array(z.object({ codigo: z.string(), nome: z.string() })).default([]),
            })
            .parse(req.body)

        const peca = await prisma.peca.findUnique({ where: { id } })
        if (!peca) throw new NotFoundError('Peça', id)
        if (peca.solicitanteId !== user.id) throw new ForbiddenError()
        if (!['RASCUNHO', 'REPROVADA'].includes(peca.status)) {
            throw new UnprocessableError('Somente peças em RASCUNHO ou REPROVADA podem ser submetidas.')
        }

        // Valida conteúdo conforme canal (schema Zod por canal)
        const conteudoSchema = getConteudoSchema(peca.canal)
        const conteudoParseado = conteudoSchema.parse(body.conteudo)

        // Calcula grupos (dedup — RN-08)
        const grupos = await calcularGruposDaVersao(peca.segmentoId, peca.assuntoId)

        if (grupos.length === 0 && body.unidadesExtras.length === 0) {
            throw new UnprocessableError('Não há grupos nem unidades extras para aprovação.')
        }

        const versao = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Número da próxima versão (RN-07)
            const ultimaVersao = await tx.versaoPeca.findFirst({
                where: { pecaId: id },
                orderBy: { numeroVersao: 'desc' },
            })
            const proximoNumero = (ultimaVersao?.numeroVersao ?? 0) + 1

            // Cria VersaoPeca imutável
            const v = await tx.versaoPeca.create({
                data: { pecaId: id, numeroVersao: proximoNumero, conteudo: conteudoParseado, status: 'PENDENTE' },
            })

            // Snapshot dos grupos (RN-07 — imutável)
            await tx.versaoGrupo.createMany({
                data: grupos.map((g) => ({ versaoPecaId: v.id, grupoId: g.id, origem: g.origem })),
            })

            // Unidades adicionais (RN-12)
            if (body.unidadesExtras.length > 0) {
                await tx.unidadeAdicional.createMany({
                    data: body.unidadesExtras.map((u) => ({ versaoPecaId: v.id, codigo: u.codigo, nome: u.nome })),
                })
            }

            // Muda status da peça (RN-13)
            await tx.peca.update({ where: { id }, data: { status: 'AGUARDANDO_APROVACAO' } })

            // Evento de auditoria
            await tx.eventoHistorico.create({
                data: { pecaId: id, versaoPecaId: v.id, usuarioId: user.id, evento: 'PECA_SUBMETIDA' },
            })

            return v
        })

        return reply.status(201).send(versao)
    })
}
