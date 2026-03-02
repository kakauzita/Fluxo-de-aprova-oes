"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function authRoutes(app) {
    // POST /auth/login
    app.post('/auth/login', async (req, reply) => {
        const body = zod_1.z.object({
            email: zod_1.z.string().email(),
            senha: zod_1.z.string().min(1),
        }).parse(req.body);
        const usuario = await prisma_1.prisma.usuario.findUnique({ where: { email: body.email } });
        if (!usuario || !usuario.ativo) {
            throw new errors_1.AppError('Credenciais inválidas.', 401);
        }
        const senhaValida = await bcryptjs_1.default.compare(body.senha, usuario.senhaHash);
        if (!senhaValida)
            throw new errors_1.AppError('Credenciais inválidas.', 401);
        const token = app.jwt.sign({ id: usuario.id, perfil: usuario.perfil }, { expiresIn: '8h' });
        return reply.send({
            token,
            usuario: { id: usuario.id, codigo: usuario.codigo, nome: usuario.nome, perfil: usuario.perfil },
        });
    });
    // GET /auth/me
    app.get('/auth/me', { preHandler: [app.authenticate] }, async (req) => {
        const user = req.user;
        return prisma_1.prisma.usuario.findUnique({
            where: { id: user.id },
            select: { id: true, codigo: true, nome: true, email: true, perfil: true },
        });
    });
}
//# sourceMappingURL=auth.routes.js.map