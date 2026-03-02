import { FastifyRequest, FastifyReply } from 'fastify'
import { PerfilTipo } from '@prisma/client'
import { ForbiddenError } from './errors'

export function requirePerfil(...perfis: PerfilTipo[]) {
    return async (req: FastifyRequest, _reply: FastifyReply) => {
        const user = (req as any).user as { id: string; perfil: PerfilTipo }
        if (!user || !perfis.includes(user.perfil)) {
            throw new ForbiddenError(
                `Acesso restrito a: ${perfis.join(', ')}. Seu perfil: ${user?.perfil ?? 'desconhecido'}.`,
            )
        }
    }
}
