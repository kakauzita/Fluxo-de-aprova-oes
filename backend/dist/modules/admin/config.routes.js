"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicosAlvoRoutes = publicosAlvoRoutes;
exports.segmentosRoutes = segmentosRoutes;
exports.assuntosRoutes = assuntosRoutes;
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const permissions_1 = require("../../lib/permissions");
const errors_1 = require("../../lib/errors");
async function publicosAlvoRoutes(app) {
    const adminOnly = { preHandler: [app.authenticate, (0, permissions_1.requirePerfil)('ADMIN')] };
    const anyAuth = { preHandler: [app.authenticate] };
    // GET /admin/publicos-alvo
    app.get('/admin/publicos-alvo', anyAuth, async () => {
        return prisma_1.prisma.publicoAlvo.findMany({
            where: { ativo: true },
            include: {
                segmentos: {
                    where: { ativo: true },
                    include: {
                        segmentoGrupos: { include: { grupo: { select: { id: true, nome: true } } } },
                    },
                },
            },
            orderBy: { nome: 'asc' },
        });
    });
    // POST /admin/publicos-alvo
    app.post('/admin/publicos-alvo', adminOnly, async (req, reply) => {
        const body = zod_1.z.object({ nome: zod_1.z.string().min(1) }).parse(req.body);
        const pa = await prisma_1.prisma.publicoAlvo.create({ data: body });
        return reply.status(201).send(pa);
    });
    // PUT /admin/publicos-alvo/:id
    app.put('/admin/publicos-alvo/:id', adminOnly, async (req) => {
        const { id } = req.params;
        const body = zod_1.z.object({ nome: zod_1.z.string().min(1) }).parse(req.body);
        const pa = await prisma_1.prisma.publicoAlvo.findUnique({ where: { id } });
        if (!pa)
            throw new errors_1.NotFoundError('Público Alvo', id);
        return prisma_1.prisma.publicoAlvo.update({ where: { id }, data: body });
    });
    // DELETE /admin/publicos-alvo/:id
    app.delete('/admin/publicos-alvo/:id', adminOnly, async (req, reply) => {
        const { id } = req.params;
        const pa = await prisma_1.prisma.publicoAlvo.findUnique({ where: { id } });
        if (!pa)
            throw new errors_1.NotFoundError('Público Alvo', id);
        await prisma_1.prisma.publicoAlvo.update({ where: { id }, data: { ativo: false } });
        return reply.status(204).send();
    });
}
async function segmentosRoutes(app) {
    const adminOnly = { preHandler: [app.authenticate, (0, permissions_1.requirePerfil)('ADMIN')] };
    const anyAuth = { preHandler: [app.authenticate] };
    // GET /admin/segmentos
    app.get('/admin/segmentos', anyAuth, async () => {
        return prisma_1.prisma.segmento.findMany({
            where: { ativo: true },
            include: {
                publicoAlvo: true,
                segmentoGrupos: { include: { grupo: { select: { id: true, nome: true, isUniversal: true } } } },
            },
            orderBy: { nome: 'asc' },
        });
    });
    // POST /admin/segmentos
    app.post('/admin/segmentos', adminOnly, async (req, reply) => {
        const body = zod_1.z
            .object({
            nome: zod_1.z.string().min(1),
            publicoAlvoId: zod_1.z.string().uuid(),
            grupoIds: zod_1.z.array(zod_1.z.string().uuid()).min(1, 'Segmento requer ao menos 1 grupo vinculado. (RN-10)'),
        })
            .parse(req.body);
        const pa = await prisma_1.prisma.publicoAlvo.findUnique({ where: { id: body.publicoAlvoId } });
        if (!pa)
            throw new errors_1.NotFoundError('Público Alvo', body.publicoAlvoId);
        // Valida que grupos não são universais (RN-08)
        const universais = await prisma_1.prisma.grupoAprovadores.findMany({
            where: { id: { in: body.grupoIds }, isUniversal: true },
        });
        if (universais.length > 0) {
            throw new errors_1.UnprocessableError(`Grupos universais não podem ser vinculados a segmentos: ${universais.map(g => g.nome).join(', ')}`);
        }
        const segmento = await prisma_1.prisma.$transaction(async (tx) => {
            const seg = await tx.segmento.create({
                data: { nome: body.nome, publicoAlvoId: body.publicoAlvoId },
            });
            await tx.segmentoGrupo.createMany({
                data: body.grupoIds.map((grupoId) => ({ segmentoId: seg.id, grupoId })),
            });
            return seg;
        });
        return reply.status(201).send(segmento);
    });
    // PUT /admin/segmentos/:id
    app.put('/admin/segmentos/:id', adminOnly, async (req) => {
        const { id } = req.params;
        const body = zod_1.z.object({ nome: zod_1.z.string().min(1).optional() }).parse(req.body);
        const seg = await prisma_1.prisma.segmento.findUnique({ where: { id } });
        if (!seg)
            throw new errors_1.NotFoundError('Segmento', id);
        return prisma_1.prisma.segmento.update({ where: { id }, data: body });
    });
    // DELETE /admin/segmentos/:id
    app.delete('/admin/segmentos/:id', adminOnly, async (req, reply) => {
        const { id } = req.params;
        await prisma_1.prisma.segmento.update({ where: { id }, data: { ativo: false } });
        return reply.status(204).send();
    });
    // POST /admin/segmentos/:id/grupos — Vincula grupo a segmento
    app.post('/admin/segmentos/:id/grupos', adminOnly, async (req, reply) => {
        const { id } = req.params;
        const { grupoId } = zod_1.z.object({ grupoId: zod_1.z.string().uuid() }).parse(req.body);
        const grupo = await prisma_1.prisma.grupoAprovadores.findUnique({ where: { id: grupoId } });
        if (!grupo)
            throw new errors_1.NotFoundError('Grupo', grupoId);
        if (grupo.isUniversal) {
            throw new errors_1.UnprocessableError('Grupos universais não podem ser vinculados a segmentos. (RN-08)');
        }
        await prisma_1.prisma.segmentoGrupo.upsert({
            where: { segmentoId_grupoId: { segmentoId: id, grupoId } },
            create: { segmentoId: id, grupoId },
            update: {},
        });
        return reply.status(201).send({ segmentoId: id, grupoId });
    });
    // DELETE /admin/segmentos/:id/grupos/:grupoId — Desvincula grupo (RN-10)
    app.delete('/admin/segmentos/:id/grupos/:grupoId', adminOnly, async (req, reply) => {
        const { id: segmentoId, grupoId } = req.params;
        const count = await prisma_1.prisma.segmentoGrupo.count({ where: { segmentoId } });
        if (count <= 1) {
            throw new errors_1.UnprocessableError('Segmento deve ter ao menos 1 grupo vinculado. (RN-10)');
        }
        await prisma_1.prisma.segmentoGrupo.delete({
            where: { segmentoId_grupoId: { segmentoId, grupoId } },
        });
        return reply.status(204).send();
    });
}
async function assuntosRoutes(app) {
    const adminOnly = { preHandler: [app.authenticate, (0, permissions_1.requirePerfil)('ADMIN')] };
    const anyAuth = { preHandler: [app.authenticate] };
    // GET /admin/assuntos
    app.get('/admin/assuntos', anyAuth, async () => {
        return prisma_1.prisma.assunto.findMany({
            where: { ativo: true },
            include: {
                assuntoGrupos: { include: { grupo: { select: { id: true, nome: true } } } },
            },
            orderBy: { nome: 'asc' },
        });
    });
    // POST /admin/assuntos
    app.post('/admin/assuntos', adminOnly, async (req, reply) => {
        const body = zod_1.z.object({ nome: zod_1.z.string().min(1) }).parse(req.body);
        const assunto = await prisma_1.prisma.assunto.create({ data: body });
        return reply.status(201).send(assunto);
    });
    // PUT /admin/assuntos/:id
    app.put('/admin/assuntos/:id', adminOnly, async (req) => {
        const { id } = req.params;
        const body = zod_1.z.object({ nome: zod_1.z.string().min(1) }).parse(req.body);
        const a = await prisma_1.prisma.assunto.findUnique({ where: { id } });
        if (!a)
            throw new errors_1.NotFoundError('Assunto', id);
        return prisma_1.prisma.assunto.update({ where: { id }, data: body });
    });
    // DELETE /admin/assuntos/:id
    app.delete('/admin/assuntos/:id', adminOnly, async (req, reply) => {
        const { id } = req.params;
        await prisma_1.prisma.assunto.update({ where: { id }, data: { ativo: false } });
        return reply.status(204).send();
    });
    // POST /admin/assuntos/:id/grupos — Vincula grupo ao assunto (RN-11: 0..N grupos)
    app.post('/admin/assuntos/:id/grupos', adminOnly, async (req, reply) => {
        const { id: assuntoId } = req.params;
        const { grupoId } = zod_1.z.object({ grupoId: zod_1.z.string().uuid() }).parse(req.body);
        const grupo = await prisma_1.prisma.grupoAprovadores.findUnique({ where: { id: grupoId } });
        if (!grupo)
            throw new errors_1.NotFoundError('Grupo', grupoId);
        if (grupo.isUniversal) {
            throw new errors_1.UnprocessableError('Grupos universais não podem ser vinculados a assuntos. (RN-08)');
        }
        await prisma_1.prisma.assuntoGrupo.upsert({
            where: { assuntoId_grupoId: { assuntoId, grupoId } },
            create: { assuntoId, grupoId },
            update: {},
        });
        return reply.status(201).send({ assuntoId, grupoId });
    });
    // DELETE /admin/assuntos/:id/grupos/:grupoId
    app.delete('/admin/assuntos/:id/grupos/:grupoId', adminOnly, async (req, reply) => {
        const { id: assuntoId, grupoId } = req.params;
        await prisma_1.prisma.assuntoGrupo.delete({ where: { assuntoId_grupoId: { assuntoId, grupoId } } });
        return reply.status(204).send();
    });
}
//# sourceMappingURL=config.routes.js.map