import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requirePerfil } from '../../lib/permissions'
import { AppError, NotFoundError, UnprocessableError } from '../../lib/errors'
import { validarUnidade } from '../../lib/unit-api'

export async function gruposRoutes(app: FastifyInstance) {
    const adminOnly = { preHandler: [app.authenticate, requirePerfil('ADMIN')] }

    // GET /admin/grupos
    app.get('/admin/grupos', adminOnly, async () => {
        const grupos = await prisma.grupoAprovadores.findMany({
            include: {
                grupoUnidades: { include: { unidade: true } },
                grupoUsuarios: { include: { usuario: { select: { id: true, codigo: true, nome: true } } } },
                segmentoGrupos: { include: { segmento: { select: { id: true, nome: true } } } },
                assuntoGrupos: { include: { assunto: { select: { id: true, nome: true } } } },
                _count: { select: { segmentoGrupos: true, assuntoGrupos: true } },
            },
            orderBy: { nome: 'asc' },
        })
        return grupos.map(g => ({
            ...g,
            possuiVinculo: g._count.segmentoGrupos > 0 || g._count.assuntoGrupos > 0,
            vinculacoesNomes: [
                ...g.segmentoGrupos.map(sg => `Segmento: ${sg.segmento.nome}`),
                ...g.assuntoGrupos.map(ag => `Assunto: ${ag.assunto.nome}`),
            ],
        }))
    })

    // POST /admin/grupos
    app.post('/admin/grupos', adminOnly, async (req, reply) => {
        const body = z.object({
            nome: z.string().min(1),
            isUniversal: z.boolean().default(false),
        }).parse(req.body)

        const grupo = await prisma.grupoAprovadores.create({ data: body })
        return reply.status(201).send(grupo)
    })

    // PUT /admin/grupos/:id
    app.put('/admin/grupos/:id', adminOnly, async (req) => {
        const { id } = req.params as { id: string }
        const body = z.object({ nome: z.string().min(1).optional() }).parse(req.body)

        const grupo = await prisma.grupoAprovadores.findUnique({ where: { id } })
        if (!grupo) throw new NotFoundError('Grupo', id)

        return prisma.grupoAprovadores.update({ where: { id }, data: body })
    })

    // DELETE /admin/grupos/:id
    app.delete('/admin/grupos/:id', adminOnly, async (req, reply) => {
        const { id } = req.params as { id: string }
        const grupo = await prisma.grupoAprovadores.findUnique({ where: { id } })
        if (!grupo) throw new NotFoundError('Grupo', id)

        await prisma.grupoAprovadores.update({ where: { id }, data: { ativo: false } })
        return reply.status(204).send()
    })

    // POST /admin/grupos/:id/universal — Define como universal (RN-08, RN-09)
    app.post('/admin/grupos/:id/universal', adminOnly, async (req) => {
        const { id } = req.params as { id: string }
        const grupo = await prisma.grupoAprovadores.findUnique({ where: { id } })
        if (!grupo) throw new NotFoundError('Grupo', id)

        const possuiVinculo =
            (await prisma.segmentoGrupo.count({ where: { grupoId: id } })) > 0 ||
            (await prisma.assuntoGrupo.count({ where: { grupoId: id } })) > 0

        if (possuiVinculo) {
            throw new UnprocessableError(
                'Grupo possui vínculos com segmentos ou assuntos. Remova-os antes de marcar como Universal. (RN-09)',
            )
        }

        return prisma.grupoAprovadores.update({ where: { id }, data: { isUniversal: true } })
    })

    // DELETE /admin/grupos/:id/universal — Remove flag universal
    app.delete('/admin/grupos/:id/universal', adminOnly, async (req) => {
        const { id } = req.params as { id: string }
        const grupo = await prisma.grupoAprovadores.findUnique({ where: { id } })
        if (!grupo) throw new NotFoundError('Grupo', id)

        return prisma.grupoAprovadores.update({ where: { id }, data: { isUniversal: false } })
    })



    // POST /admin/grupos/:id/usuarios — Adiciona usuário ao grupo
    app.post('/admin/grupos/:id/usuarios', adminOnly, async (req, reply) => {
        const { id } = req.params as { id: string }
        const { usuarioId } = z.object({ usuarioId: z.string().uuid() }).parse(req.body)

        const [grupo, usuario] = await Promise.all([
            prisma.grupoAprovadores.findUnique({ where: { id } }),
            prisma.usuario.findUnique({ where: { id: usuarioId } }),
        ])
        if (!grupo) throw new NotFoundError('Grupo', id)
        if (!usuario) throw new NotFoundError('Usuário', usuarioId)

        await prisma.grupoUsuario.upsert({
            where: { grupoId_usuarioId: { grupoId: id, usuarioId } },
            create: { grupoId: id, usuarioId },
            update: {},
        })

        return reply.status(201).send({ grupo: id, usuario: usuarioId })
    })

    // DELETE /admin/grupos/:id/usuarios/:usuarioId
    app.delete('/admin/grupos/:id/usuarios/:usuarioId', adminOnly, async (req, reply) => {
        const { id, usuarioId } = req.params as { id: string; usuarioId: string }
        await prisma.grupoUsuario.deleteMany({ where: { grupoId: id, usuarioId } })
        return reply.status(204).send()
    })

    // POST /admin/grupos/:id/unidades — Vincula unidade ao grupo
    app.post('/admin/grupos/:id/unidades', adminOnly, async (req, reply) => {
        const { id } = req.params as { id: string }
        const { unidadeId } = z.object({ unidadeId: z.string().uuid() }).parse(req.body)

        const [grupo, unidade] = await Promise.all([
            prisma.grupoAprovadores.findUnique({ where: { id } }),
            prisma.unidade.findUnique({ where: { id: unidadeId } }),
        ])
        if (!grupo) throw new NotFoundError('Grupo', id)
        if (!unidade) throw new NotFoundError('Unidade', unidadeId)

        await prisma.grupoUnidade.upsert({
            where: { grupoId_unidadeId: { grupoId: id, unidadeId } },
            create: { grupoId: id, unidadeId },
            update: {},
        })
        return reply.status(201).send({ grupoId: id, unidadeId })
    })

    // DELETE /admin/grupos/:id/unidades/:unidadeId — Desvincula unidade do grupo
    app.delete('/admin/grupos/:id/unidades/:unidadeId', adminOnly, async (req, reply) => {
        const { id, unidadeId } = req.params as { id: string; unidadeId: string }
        await prisma.grupoUnidade.deleteMany({ where: { grupoId: id, unidadeId } })
        return reply.status(204).send()
    })
}
