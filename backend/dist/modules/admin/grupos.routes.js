"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gruposRoutes = gruposRoutes;
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const permissions_1 = require("../../lib/permissions");
const errors_1 = require("../../lib/errors");
async function gruposRoutes(app) {
    const adminOnly = { preHandler: [app.authenticate, (0, permissions_1.requirePerfil)('ADMIN')] };
    // GET /admin/grupos
    app.get('/admin/grupos', adminOnly, async () => {
        const grupos = await prisma_1.prisma.grupoAprovadores.findMany({
            include: {
                grupoUnidades: { include: { unidade: true } },
                grupoUsuarios: { include: { usuario: { select: { id: true, codigo: true, nome: true } } } },
                segmentoGrupos: { include: { segmento: { select: { id: true, nome: true } } } },
                assuntoGrupos: { include: { assunto: { select: { id: true, nome: true } } } },
                _count: { select: { segmentoGrupos: true, assuntoGrupos: true } },
            },
            orderBy: { nome: 'asc' },
        });
        return grupos.map(g => ({
            ...g,
            possuiVinculo: g._count.segmentoGrupos > 0 || g._count.assuntoGrupos > 0,
            vinculacoesNomes: [
                ...g.segmentoGrupos.map(sg => `Segmento: ${sg.segmento.nome}`),
                ...g.assuntoGrupos.map(ag => `Assunto: ${ag.assunto.nome}`),
            ],
        }));
    });
    // POST /admin/grupos
    app.post('/admin/grupos', adminOnly, async (req, reply) => {
        const body = zod_1.z.object({
            nome: zod_1.z.string().min(1),
            isUniversal: zod_1.z.boolean().default(false),
        }).parse(req.body);
        const grupo = await prisma_1.prisma.grupoAprovadores.create({ data: body });
        return reply.status(201).send(grupo);
    });
    // PUT /admin/grupos/:id
    app.put('/admin/grupos/:id', adminOnly, async (req) => {
        const { id } = req.params;
        const body = zod_1.z.object({ nome: zod_1.z.string().min(1).optional() }).parse(req.body);
        const grupo = await prisma_1.prisma.grupoAprovadores.findUnique({ where: { id } });
        if (!grupo)
            throw new errors_1.NotFoundError('Grupo', id);
        return prisma_1.prisma.grupoAprovadores.update({ where: { id }, data: body });
    });
    // DELETE /admin/grupos/:id
    app.delete('/admin/grupos/:id', adminOnly, async (req, reply) => {
        const { id } = req.params;
        const grupo = await prisma_1.prisma.grupoAprovadores.findUnique({ where: { id } });
        if (!grupo)
            throw new errors_1.NotFoundError('Grupo', id);
        await prisma_1.prisma.grupoAprovadores.update({ where: { id }, data: { ativo: false } });
        return reply.status(204).send();
    });
    // POST /admin/grupos/:id/universal — Define como universal (RN-08, RN-09)
    app.post('/admin/grupos/:id/universal', adminOnly, async (req) => {
        const { id } = req.params;
        const grupo = await prisma_1.prisma.grupoAprovadores.findUnique({ where: { id } });
        if (!grupo)
            throw new errors_1.NotFoundError('Grupo', id);
        const possuiVinculo = (await prisma_1.prisma.segmentoGrupo.count({ where: { grupoId: id } })) > 0 ||
            (await prisma_1.prisma.assuntoGrupo.count({ where: { grupoId: id } })) > 0;
        if (possuiVinculo) {
            throw new errors_1.UnprocessableError('Grupo possui vínculos com segmentos ou assuntos. Remova-os antes de marcar como Universal. (RN-09)');
        }
        return prisma_1.prisma.grupoAprovadores.update({ where: { id }, data: { isUniversal: true } });
    });
    // DELETE /admin/grupos/:id/universal — Remove flag universal
    app.delete('/admin/grupos/:id/universal', adminOnly, async (req) => {
        const { id } = req.params;
        const grupo = await prisma_1.prisma.grupoAprovadores.findUnique({ where: { id } });
        if (!grupo)
            throw new errors_1.NotFoundError('Grupo', id);
        return prisma_1.prisma.grupoAprovadores.update({ where: { id }, data: { isUniversal: false } });
    });
    // POST /admin/grupos/:id/usuarios — Adiciona usuário ao grupo
    app.post('/admin/grupos/:id/usuarios', adminOnly, async (req, reply) => {
        const { id } = req.params;
        const { usuarioId } = zod_1.z.object({ usuarioId: zod_1.z.string().uuid() }).parse(req.body);
        const [grupo, usuario] = await Promise.all([
            prisma_1.prisma.grupoAprovadores.findUnique({ where: { id } }),
            prisma_1.prisma.usuario.findUnique({ where: { id: usuarioId } }),
        ]);
        if (!grupo)
            throw new errors_1.NotFoundError('Grupo', id);
        if (!usuario)
            throw new errors_1.NotFoundError('Usuário', usuarioId);
        await prisma_1.prisma.grupoUsuario.upsert({
            where: { grupoId_usuarioId: { grupoId: id, usuarioId } },
            create: { grupoId: id, usuarioId },
            update: {},
        });
        return reply.status(201).send({ grupo: id, usuario: usuarioId });
    });
    // DELETE /admin/grupos/:id/usuarios/:usuarioId
    app.delete('/admin/grupos/:id/usuarios/:usuarioId', adminOnly, async (req, reply) => {
        const { id, usuarioId } = req.params;
        await prisma_1.prisma.grupoUsuario.deleteMany({ where: { grupoId: id, usuarioId } });
        return reply.status(204).send();
    });
    // POST /admin/grupos/:id/unidades — Vincula unidade ao grupo
    app.post('/admin/grupos/:id/unidades', adminOnly, async (req, reply) => {
        const { id } = req.params;
        const { unidadeId } = zod_1.z.object({ unidadeId: zod_1.z.string().uuid() }).parse(req.body);
        const [grupo, unidade] = await Promise.all([
            prisma_1.prisma.grupoAprovadores.findUnique({ where: { id } }),
            prisma_1.prisma.unidade.findUnique({ where: { id: unidadeId } }),
        ]);
        if (!grupo)
            throw new errors_1.NotFoundError('Grupo', id);
        if (!unidade)
            throw new errors_1.NotFoundError('Unidade', unidadeId);
        await prisma_1.prisma.grupoUnidade.upsert({
            where: { grupoId_unidadeId: { grupoId: id, unidadeId } },
            create: { grupoId: id, unidadeId },
            update: {},
        });
        return reply.status(201).send({ grupoId: id, unidadeId });
    });
    // DELETE /admin/grupos/:id/unidades/:unidadeId — Desvincula unidade do grupo
    app.delete('/admin/grupos/:id/unidades/:unidadeId', adminOnly, async (req, reply) => {
        const { id, unidadeId } = req.params;
        await prisma_1.prisma.grupoUnidade.deleteMany({ where: { grupoId: id, unidadeId } });
        return reply.status(204).send();
    });
}
//# sourceMappingURL=grupos.routes.js.map