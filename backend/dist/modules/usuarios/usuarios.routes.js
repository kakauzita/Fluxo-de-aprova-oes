"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usuariosRoutes = usuariosRoutes;
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const permissions_1 = require("../../lib/permissions");
const errors_1 = require("../../lib/errors");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
async function usuariosRoutes(app) {
    const adminOnly = { preHandler: [app.authenticate, (0, permissions_1.requirePerfil)('ADMIN')] };
    // GET /usuarios
    app.get('/usuarios', adminOnly, async () => {
        return prisma_1.prisma.usuario.findMany({
            select: { id: true, codigo: true, nome: true, email: true, perfil: true, ativo: true },
            orderBy: { nome: 'asc' },
        });
    });
    // POST /usuarios — Admin cria usuários
    app.post('/usuarios', adminOnly, async (req, reply) => {
        const body = zod_1.z.object({
            codigo: zod_1.z.string().min(1),
            nome: zod_1.z.string().min(1),
            email: zod_1.z.string().email(),
            senha: zod_1.z.string().min(6),
            perfil: zod_1.z.nativeEnum(client_1.PerfilTipo),
        }).parse(req.body);
        const senhaHash = await bcryptjs_1.default.hash(body.senha, 10);
        const usuario = await prisma_1.prisma.usuario.create({
            data: { codigo: body.codigo, nome: body.nome, email: body.email, senhaHash, perfil: body.perfil },
            select: { id: true, codigo: true, nome: true, email: true, perfil: true },
        });
        return reply.status(201).send(usuario);
    });
    // PUT /usuarios/:id
    app.put('/usuarios/:id', adminOnly, async (req) => {
        const { id } = req.params;
        const body = zod_1.z.object({
            nome: zod_1.z.string().min(1).optional(),
            perfil: zod_1.z.nativeEnum(client_1.PerfilTipo).optional(),
            ativo: zod_1.z.boolean().optional(),
        }).parse(req.body);
        const usuario = await prisma_1.prisma.usuario.findUnique({ where: { id } });
        if (!usuario)
            throw new errors_1.NotFoundError('Usuário', id);
        return prisma_1.prisma.usuario.update({
            where: { id },
            data: body,
            select: { id: true, codigo: true, nome: true, email: true, perfil: true, ativo: true },
        });
    });
}
//# sourceMappingURL=usuarios.routes.js.map