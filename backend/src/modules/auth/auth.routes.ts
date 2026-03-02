import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'
import bcrypt from 'bcryptjs'

export async function authRoutes(app: FastifyInstance) {
    // POST /auth/login
    app.post('/auth/login', async (req, reply) => {
        const body = z.object({
            email: z.string().email(),
            senha: z.string().min(1),
        }).parse(req.body)

        const usuario = await prisma.usuario.findUnique({ where: { email: body.email } })
        if (!usuario || !usuario.ativo) {
            throw new AppError('Credenciais inválidas.', 401)
        }

        const senhaValida = await bcrypt.compare(body.senha, usuario.senhaHash)
        if (!senhaValida) throw new AppError('Credenciais inválidas.', 401)

        const token = app.jwt.sign({ id: usuario.id, perfil: usuario.perfil }, { expiresIn: '8h' })

        return reply.send({
            token,
            usuario: { id: usuario.id, codigo: usuario.codigo, nome: usuario.nome, perfil: usuario.perfil },
        })
    })

    // GET /auth/me
    app.get('/auth/me', { preHandler: [app.authenticate] }, async (req) => {
        const user = (req as any).user as { id: string }
        return prisma.usuario.findUnique({
            where: { id: user.id },
            select: { id: true, codigo: true, nome: true, email: true, perfil: true },
        })
    })
}
