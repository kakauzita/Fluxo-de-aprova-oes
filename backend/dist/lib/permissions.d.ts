import { FastifyRequest, FastifyReply } from 'fastify';
import { PerfilTipo } from '@prisma/client';
export declare function requirePerfil(...perfis: PerfilTipo[]): (req: FastifyRequest, _reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=permissions.d.ts.map