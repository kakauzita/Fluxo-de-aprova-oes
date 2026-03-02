import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requirePerfil } from '../../lib/permissions'
import { NotFoundError } from '../../lib/errors'
import bcrypt from 'bcryptjs'
import { PerfilTipo } from '@prisma/client'

export async function usuariosRoutes(app: FastifyInstance) {
    const adminOnly = { preHandler: [app.authenticate, requirePerfil('ADMIN')] }

    // GET /usuarios
    app.get('/usuarios', adminOnly, async () => {
        return prisma.usuario.findMany({
            select: { id: true, codigo: true, nome: true, email: true, perfil: true, ativo: true },
            orderBy: { nome: 'asc' },
        })
    })

    // POST /usuarios — Admin cria usuários
    app.post('/usuarios', adminOnly, async (req, reply) => {
        const body = z.object({
            codigo: z.string().min(1),
            nome: z.string().min(1),
            email: z.string().email(),
            senha: z.string().min(6),
            perfil: z.nativeEnum(PerfilTipo),
        }).parse(req.body)

        const senhaHash = await bcrypt.hash(body.senha, 10)
        const usuario = await prisma.usuario.create({
            data: { codigo: body.codigo, nome: body.nome, email: body.email, senhaHash, perfil: body.perfil },
            select: { id: true, codigo: true, nome: true, email: true, perfil: true },
        })

        return reply.status(201).send(usuario)
    })

    // PUT /usuarios/:id
    app.put('/usuarios/:id', adminOnly, async (req) => {
        const { id } = req.params as { id: string }
        const body = z.object({
            nome: z.string().min(1).optional(),
            perfil: z.nativeEnum(PerfilTipo).optional(),
            ativo: z.boolean().optional(),
        }).parse(req.body)

        const usuario = await prisma.usuario.findUnique({ where: { id } })
        if (!usuario) throw new NotFoundError('Usuário', id)

        return prisma.usuario.update({
            where: { id },
            data: body,
            select: { id: true, codigo: true, nome: true, email: true, perfil: true, ativo: true },
        })
    })
}
