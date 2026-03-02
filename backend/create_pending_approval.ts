import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const solicitante = await prisma.usuario.findFirst({ where: { perfil: 'SOLICITANTE' } })
    const publicoAlvo = await prisma.publicoAlvo.findFirst()
    const segmento = await prisma.segmento.findFirst()
    const assunto = await prisma.assunto.findFirst()

    if (!solicitante || !publicoAlvo || !segmento || !assunto) {
        console.error("Missing required master data")
        return
    }

    const peca = await prisma.peca.create({
        data: {
            nome: 'Peça Teste Nova Interface',
            canal: 'WHATSAPP',
            descricao: 'Teste para validar interface',
            solicitanteId: solicitante.id,
            publicoAlvoId: publicoAlvo.id,
            segmentoId: segmento.id,
            assuntoId: assunto.id,
            status: 'AGUARDANDO_APROVACAO',
        }
    })

    // AGUARDANDO_APROVACAO for default
    // PENDENTE for Versao status
    const versao = await prisma.versaoPeca.create({
        data: {
            pecaId: peca.id,
            numeroVersao: 1,
            conteudo: { mensagem: 'Mensagem de teste UI Aprovação.' },
            status: 'PENDENTE',
            submetidoEm: new Date(),
        }
    })

    const grupoAprovador1 = await prisma.grupoAprovadores.findFirst()
    const grupoAprovador2 = await prisma.grupoAprovadores.findMany().then(res => res[1])

    if (grupoAprovador1) {
        await prisma.versaoGrupo.create({
            data: { versaoPecaId: versao.id, grupoId: grupoAprovador1.id, origem: 'ASSUNTO' }
        })
    }

    if (grupoAprovador2) {
        await prisma.versaoGrupo.create({
            data: { versaoPecaId: versao.id, grupoId: grupoAprovador2.id, origem: 'SEGMENTO' }
        })
    }

    console.log("Piece created successfully!")
}

main().catch(console.error).finally(() => prisma.$disconnect())
