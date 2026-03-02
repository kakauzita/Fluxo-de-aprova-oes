"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unidadesAdminRoutes = unidadesAdminRoutes;
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const permissions_1 = require("../../lib/permissions");
async function unidadesAdminRoutes(app) {
    const adminOnly = { preHandler: [app.authenticate, (0, permissions_1.requirePerfil)('ADMIN')] };
    // GET /admin/unidades — lista todas as unidades
    app.get('/admin/unidades', adminOnly, async () => {
        return prisma_1.prisma.unidade.findMany({
            orderBy: { codigo: 'asc' },
        });
    });
    // POST /admin/unidades — cria nova unidade
    app.post('/admin/unidades', adminOnly, async (req, reply) => {
        const body = zod_1.z.object({
            codigo: zod_1.z.string().min(1),
            sigla: zod_1.z.string().min(1),
            nome: zod_1.z.string().min(1),
        }).parse(req.body);
        const unidade = await prisma_1.prisma.unidade.create({ data: body });
        return reply.status(201).send(unidade);
    });
    // PATCH /admin/unidades/:id — edita unidade
    app.patch('/admin/unidades/:id', adminOnly, async (req) => {
        const { id } = req.params;
        const body = zod_1.z.object({
            codigo: zod_1.z.string().optional(),
            sigla: zod_1.z.string().optional(),
            nome: zod_1.z.string().optional(),
            ativo: zod_1.z.boolean().optional(),
        }).parse(req.body);
        return prisma_1.prisma.unidade.update({ where: { id }, data: body });
    });
    // DELETE /admin/unidades/:id — desativa (soft delete)
    app.delete('/admin/unidades/:id', adminOnly, async (req, reply) => {
        const { id } = req.params;
        await prisma_1.prisma.unidade.update({ where: { id }, data: { ativo: false } });
        return reply.status(204).send();
    });
}
//# sourceMappingURL=unidades.routes.js.map