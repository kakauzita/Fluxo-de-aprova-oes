import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCors from '@fastify/cors'
import { AppError } from './lib/errors'
import { ZodError } from 'zod'

// Routes
import { authRoutes } from './modules/auth/auth.routes'
import { usuariosRoutes } from './modules/usuarios/usuarios.routes'
import { gruposRoutes } from './modules/admin/grupos.routes'
import { publicosAlvoRoutes, segmentosRoutes, assuntosRoutes } from './modules/admin/config.routes'
import { unidadesAdminRoutes } from './modules/admin/unidades.routes'
import { pecasRoutes } from './modules/pecas/pecas.routes'
import { aprovacaoRoutes } from './modules/aprovacoes/aprovacao.routes'

const app = Fastify({ logger: true })

// ── Plugins ──────────────────────────────────────────────────────────
app.register(fastifyCors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
})

app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'super-secret-change-in-production',
})

// Decorator: app.authenticate — usado como preHandler
app.decorate('authenticate', async function (req: any, reply: any) {
    try {
        await req.jwtVerify()
    } catch {
        reply.status(401).send({ error: 'Token inválido ou expirado.' })
    }
})

// ── Error Handler ──────────────────────────────────────────────────────
app.setErrorHandler((error: any, _req, reply) => {
    try { require('fs').appendFileSync('api-errors.log', new Date().toISOString() + ' ' + (error?.message || 'err') + '\n' + (error?.stack || 'err') + '\n\n') } catch (e) { }
    if (error instanceof ZodError) {
        return reply.status(400).send({
            error: 'Dados inválidos.',
            issues: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        })
    }

    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message, code: error.code })
    }

    app.log.error(error)
    return reply.status(500).send({ error: 'Erro interno do servidor.', message: error.message })
})

// ── Routes ────────────────────────────────────────────────────────────
app.register(authRoutes)
app.register(usuariosRoutes)
app.register(gruposRoutes)
app.register(publicosAlvoRoutes)
app.register(segmentosRoutes)
app.register(assuntosRoutes)
app.register(unidadesAdminRoutes)
app.register(pecasRoutes)
app.register(aprovacaoRoutes)

// ── Health Check ──────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// ── Start ─────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3333)

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
    if (err) {
        app.log.error(err)
        process.exit(1)
    }
    console.log(`🚀 Backend rodando em http://localhost:${PORT}`)
})

export default app
