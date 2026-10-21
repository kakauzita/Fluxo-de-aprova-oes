"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const cors_1 = __importDefault(require("@fastify/cors"));
const errors_1 = require("./lib/errors");
const zod_1 = require("zod");
// Routes
const auth_routes_1 = require("./modules/auth/auth.routes");
const usuarios_routes_1 = require("./modules/usuarios/usuarios.routes");
const grupos_routes_1 = require("./modules/admin/grupos.routes");
const config_routes_1 = require("./modules/admin/config.routes");
const unidades_routes_1 = require("./modules/admin/unidades.routes");
const pecas_routes_1 = require("./modules/pecas/pecas.routes");
const aprovacao_routes_1 = require("./modules/aprovacoes/aprovacao.routes");
const app = (0, fastify_1.default)({ logger: true });
// ── Plugins ──────────────────────────────────────────────────────────
app.register(cors_1.default, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
});
app.register(jwt_1.default, {
    secret: process.env.JWT_SECRET ?? 'super-secret-change-in-production',
});
// Decorator: app.authenticate — usado como preHandler
app.decorate('authenticate', async function (req, reply) {
    try {
        await req.jwtVerify();
    }
    catch {
        reply.status(401).send({ error: 'Token inválido ou expirado.' });
    }
});
// ── Error Handler ──────────────────────────────────────────────────────
app.setErrorHandler((error, _req, reply) => {
    try {
        require('fs').appendFileSync('api-errors.log', new Date().toISOString() + ' ' + (error?.message || 'err') + '\n' + (error?.stack || 'err') + '\n\n');
    }
    catch (e) { }
    if (error instanceof zod_1.ZodError) {
        return reply.status(400).send({
            error: 'Dados inválidos.',
            issues: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        });
    }
    if (error instanceof errors_1.AppError) {
        return reply.status(error.statusCode).send({ error: error.message, code: error.code });
    }
    app.log.error(error);
    return reply.status(500).send({ error: 'Erro interno do servidor.', message: error.message });
});
// ── Routes ────────────────────────────────────────────────────────────
app.register(auth_routes_1.authRoutes);
app.register(usuarios_routes_1.usuariosRoutes);
app.register(grupos_routes_1.gruposRoutes);
app.register(config_routes_1.publicosAlvoRoutes);
app.register(config_routes_1.segmentosRoutes);
app.register(config_routes_1.assuntosRoutes);
app.register(unidades_routes_1.unidadesAdminRoutes);
app.register(pecas_routes_1.pecasRoutes);
app.register(aprovacao_routes_1.aprovacaoRoutes);
// ── Health Check ──────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
// ── Start ─────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3333);
app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=app.js.map