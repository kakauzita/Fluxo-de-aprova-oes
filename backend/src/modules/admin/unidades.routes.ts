import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requirePerfil } from '../../lib/permissions'

export async function unidadesAdminRoutes(app: FastifyInstance) {
    const adminOnly = { preHandler: [app.authenticate, requirePerfil('ADMIN')] }

    // GET /admin/unidades — lista todas as unidades
    app.get('/admin/unidades', adminOnly, async () => {
        return prisma.unidade.findMany({
            orderBy: { codigo: 'asc' },
        })
    })

    // POST /admin/unidades — cria nova unidade
    app.post('/admin/unidades', adminOnly, async (req, reply) => {
        const body = z.object({
            codigo: z.string().min(1),
            sigla: z.string().min(1),
            nome: z.string().min(1),
        }).parse(req.body)
        const unidade = await prisma.unidade.create({ data: body })
        return reply.status(201).send(unidade)
    })

    // PATCH /admin/unidades/:id — edita unidade
    app.patch('/admin/unidades/:id', adminOnly, async (req) => {
        const { id } = req.params as { id: string }
        const body = z.object({
            codigo: z.string().optional(),
            sigla: z.string().optional(),
            nome: z.string().optional(),
            ativo: z.boolean().optional(),
        }).parse(req.body)
        return prisma.unidade.update({ where: { id }, data: body })
    })

    // DELETE /admin/unidades/:id — desativa (soft delete)
    app.delete('/admin/unidades/:id', adminOnly, async (req, reply) => {
        const { id } = req.params as { id: string }
        await prisma.unidade.update({ where: { id }, data: { ativo: false } })
        return reply.status(204).send()
    })
}
