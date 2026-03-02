import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requirePerfil } from '../../lib/permissions'
import { ForbiddenError, NotFoundError, UnprocessableError } from '../../lib/errors'
import { Prisma } from '@prisma/client'
import { consolidar } from '../../shared/consolidation'

export async function aprovacaoRoutes(app: FastifyInstance) {
    const aprovadorOnly = { preHandler: [app.authenticate, requirePerfil('APROVADOR')] }

    // GET /aprovacoes/pendentes — Lista versões onde o aprovador tem voto pendente
    app.get('/aprovacoes/pendentes', aprovadorOnly, async (req) => {
        const user = (req as any).user as { id: string }

        // Grupos dos quais o aprovador é membro (via usuário direto ou via unidade)
        const gruposDoAprovador = await prisma.grupoUsuario.findMany({
            where: { usuarioId: user.id },
            select: { grupoId: true },
        })
        const grupoIds = gruposDoAprovador.map((g: { grupoId: string }) => g.grupoId)

        // VersaoGrupos onde o aprovador tem participação e ainda não há manifestação
        const versaoGruposPendentes = await prisma.versaoGrupo.findMany({
            where: {
                grupoId: { in: grupoIds },
                versaoPeca: { status: 'PENDENTE' },
                // Sem manifestação ainda
                NOT: {
                    versaoPecaId: {
                        in: (
                            await prisma.manifestacaoGrupo.findMany({
                                where: { grupoId: { in: grupoIds } },
                                select: { versaoPecaId: true },
                            })
                        ).map((m: { versaoPecaId: string }) => m.versaoPecaId),
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
        })

        return versaoGruposPendentes
    })

    // POST /aprovacoes/:versaoId/votar — Registra aprovação ou reprovação (RN-01, RN-02, RN-03)
    app.post('/aprovacoes/:versaoId/votar', aprovadorOnly, async (req) => {
        const { versaoId } = req.params as { versaoId: string }
        const user = (req as any).user as { id: string }

        const body = z
            .object({
                decisao: z.enum(['APROVADO', 'REPROVADO']),
                justificativa: z.string().optional(),
                unidadeAdicionalId: z.string().uuid().optional(), // se votando como unidade adicional
            })
            .parse(req.body)

        // Valida justificativa obrigatória (RN-03)
        if (body.decisao === 'REPROVADO' && !body.justificativa?.trim()) {
            throw new UnprocessableError('Justificativa é obrigatória para reprovação. (RN-03)')
        }

        const versao = await prisma.versaoPeca.findUnique({
            where: { id: versaoId },
            include: { peca: true },
        })

        if (!versao) throw new NotFoundError('Versão da Peça', versaoId)
        if (versao.status !== 'PENDENTE') {
            throw new UnprocessableError('Esta versão já foi consolidada e não aceita mais votos.')
        }

        // --- Resolução do grupo do aprovador (RN-01) ---
        let grupoId: string | null = null

        if (body.unidadeAdicionalId) {
            // Voto em nome de unidade adicional
            const ua = await prisma.unidadeAdicional.findUnique({ where: { id: body.unidadeAdicionalId } })
            if (!ua || ua.versaoPecaId !== versaoId) {
                throw new NotFoundError('Unidade Adicional', body.unidadeAdicionalId)
            }

            // Verifica bloqueio (RN-02)
            const jaVotou = await prisma.manifestacaoGrupo.findUnique({
                where: { unidadeAdicionalId: body.unidadeAdicionalId },
            })
            if (jaVotou) throw new UnprocessableError('Esta unidade adicional já manifestou nesta versão. (RN-02)')

        } else {
            // Voto em nome de grupo
            const grupoDoUsuario = await resolverGrupoNaVersao(versaoId, user.id)
            if (!grupoDoUsuario) {
                throw new ForbiddenError('Você não pertence a nenhum grupo com voto pendente nesta versão.')
            }

            // Verifica bloqueio do grupo (RN-02)
            const jaVotou = await prisma.manifestacaoGrupo.findUnique({
                where: { versaoPecaId_grupoId: { versaoPecaId: versaoId, grupoId: grupoDoUsuario } },
            })
            if (jaVotou) throw new UnprocessableError('Seu grupo já manifestou nesta versão. (RN-02)')

            grupoId = grupoDoUsuario
        }

        // Resolve informações do usuário para auditoria (RN-15)
        const userInfo = await prisma.usuario.findUnique({ where: { id: user.id } })

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
            })

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
            })

            // 3. Tenta consolidar (RN-04 — somente quando todos votaram)
            await consolidar(versaoId, tx as any)
        })

        return { ok: true, mensagem: `Voto '${body.decisao}' registrado com sucesso.` }
    })

    // GET /aprovacoes/historico/:versaoId — Histórico de votos de uma versão
    app.get('/aprovacoes/historico/:versaoId', { preHandler: [app.authenticate] }, async (req) => {
        const { versaoId } = req.params as { versaoId: string }

        return prisma.manifestacaoGrupo.findMany({
            where: { versaoPecaId: versaoId },
            include: {
                representadoPor: { select: { id: true, codigo: true, nome: true } },
                grupo: { select: { id: true, nome: true } },
                unidadeAdicional: true,
            },
            orderBy: { manifestadoEm: 'asc' },
        })
    })
}

/**
 * Resolve o grupo ao qual o aprovador pertence dentro de uma versão específica.
 * Verifica tanto membros diretos (GrupoUsuario) quando membros via Unidade.
 */
async function resolverGrupoNaVersao(versaoPecaId: string, usuarioId: string): Promise<string | null> {
    const versaoGrupos = await prisma.versaoGrupo.findMany({
        where: { versaoPecaId },
        select: { grupoId: true },
    })

    for (const { grupoId } of versaoGrupos) {
        // Membro direto
        const membroDireto = await prisma.grupoUsuario.findUnique({
            where: { grupoId_usuarioId: { grupoId, usuarioId } },
        })
        if (membroDireto) return grupoId

        // Membro via unidade vinculada ao grupo
        const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
        if (!usuario) continue

        // Busca unidades do grupo → verifica se o aprovador pertence
        const grupoUnidades = await prisma.grupoUnidade.findMany({
            where: { grupoId },
            include: { unidade: true },
        })

        // Verificação simulada: aprovador pode ser associado a uma unidade via código
        for (const gu of grupoUnidades) {
            if (gu.unidade.codigo === usuario.codigo) return grupoId
        }
    }

    return null
}
