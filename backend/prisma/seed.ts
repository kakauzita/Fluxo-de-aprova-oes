import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
    console.log('🌱 Seeding database...')

    // --- Usuários ---
    const senhaHash = await bcrypt.hash('senha123', 10)

    const admin = await prisma.usuario.upsert({
        where: { email: 'admin@empresa.com' },
        create: { codigo: 'USR001', nome: 'Roberto (Admin)', email: 'admin@empresa.com', senhaHash, perfil: 'ADMIN' },
        update: {},
    })

    const solicitante = await prisma.usuario.upsert({
        where: { email: 'carla@empresa.com' },
        create: { codigo: 'USR002', nome: 'Carla (Solicitante)', email: 'carla@empresa.com', senhaHash, perfil: 'SOLICITANTE' },
        update: {},
    })

    const aprovador1 = await prisma.usuario.upsert({
        where: { email: 'aprovador1@empresa.com' },
        create: { codigo: 'USR003', nome: 'João (Aprovador)', email: 'aprovador1@empresa.com', senhaHash, perfil: 'APROVADOR' },
        update: {},
    })

    const aprovador2 = await prisma.usuario.upsert({
        where: { email: 'aprovador2@empresa.com' },
        create: { codigo: 'USR004', nome: 'Ana (Aprovador)', email: 'aprovador2@empresa.com', senhaHash, perfil: 'APROVADOR' },
        update: {},
    })

    const aprovadorJuridico = await prisma.usuario.upsert({
        where: { email: 'juridico@empresa.com' },
        create: { codigo: 'USR005', nome: 'Carlos (Jurídico)', email: 'juridico@empresa.com', senhaHash, perfil: 'APROVADOR' },
        update: {},
    })

    // --- Unidades ---
    const unidadeSP = await prisma.unidade.upsert({
        where: { codigo: 'UN001' },
        create: { codigo: 'UN001', nome: 'Unidade São Paulo' },
        update: {},
    })

    const unidadeJuridica = await prisma.unidade.upsert({
        where: { codigo: 'UN009' },
        create: { codigo: 'UN009', nome: 'Unidade Jurídica' },
        update: {},
    })

    // --- Grupos ---
    const grupoMarketing = await prisma.grupoAprovadores.upsert({
        where: { nome: 'Marketing Digital' },
        create: { nome: 'Marketing Digital', isUniversal: false },
        update: {},
    })

    const grupoCredito = await prisma.grupoAprovadores.upsert({
        where: { nome: 'Crédito e Risco' },
        create: { nome: 'Crédito e Risco', isUniversal: false },
        update: {},
    })

    const grupoJuridico = await prisma.grupoAprovadores.upsert({
        where: { nome: 'Jurídico' },
        create: { nome: 'Jurídico', isUniversal: true }, // Grupo Universal
        update: {},
    })

    // Membros dos grupos
    await prisma.grupoUsuario.upsert({
        where: { grupoId_usuarioId: { grupoId: grupoMarketing.id, usuarioId: aprovador1.id } },
        create: { grupoId: grupoMarketing.id, usuarioId: aprovador1.id },
        update: {},
    })
    await prisma.grupoUsuario.upsert({
        where: { grupoId_usuarioId: { grupoId: grupoCredito.id, usuarioId: aprovador2.id } },
        create: { grupoId: grupoCredito.id, usuarioId: aprovador2.id },
        update: {},
    })
    await prisma.grupoUsuario.upsert({
        where: { grupoId_usuarioId: { grupoId: grupoJuridico.id, usuarioId: aprovadorJuridico.id } },
        create: { grupoId: grupoJuridico.id, usuarioId: aprovadorJuridico.id },
        update: {},
    })
    await prisma.grupoUnidade.upsert({
        where: { grupoId_unidadeId: { grupoId: grupoMarketing.id, unidadeId: unidadeSP.id } },
        create: { grupoId: grupoMarketing.id, unidadeId: unidadeSP.id },
        update: {},
    })

    // --- Público Alvo e Segmentos ---
    const pessoaFisica = await prisma.publicoAlvo.create({ data: { nome: 'Pessoa Física' } })
    const pessoaJuridica = await prisma.publicoAlvo.create({ data: { nome: 'Pessoa Jurídica' } })

    const segBaixaRenda = await prisma.segmento.create({
        data: { nome: 'Baixa Renda', publicoAlvoId: pessoaFisica.id },
    })
    const segAposentado = await prisma.segmento.create({
        data: { nome: 'Aposentado', publicoAlvoId: pessoaFisica.id },
    })
    const segMPE = await prisma.segmento.create({
        data: { nome: 'Micro e Pequenas Empresas', publicoAlvoId: pessoaJuridica.id },
    })

    // Vínculos Segmento ↔ Grupos (RN-10: mínimo 1 grupo)
    await prisma.segmentoGrupo.createMany({
        data: [
            { segmentoId: segBaixaRenda.id, grupoId: grupoMarketing.id },
            { segmentoId: segAposentado.id, grupoId: grupoMarketing.id },
            { segmentoId: segMPE.id, grupoId: grupoCredito.id },
        ],
        skipDuplicates: true,
    })

    // --- Assuntos ---
    const assCredito = await prisma.assunto.create({ data: { nome: 'Crédito' } })
    const assCartao = await prisma.assunto.create({ data: { nome: 'Cartão de Crédito' } })
    const assFGTS = await prisma.assunto.create({ data: { nome: 'FGTS' } })

    // Vínculos Assunto ↔ Grupos (RN-11: 0..N grupos)
    await prisma.assuntoGrupo.upsert({
        where: { assuntoId_grupoId: { assuntoId: assCredito.id, grupoId: grupoCredito.id } },
        create: { assuntoId: assCredito.id, grupoId: grupoCredito.id },
        update: {},
    })

    console.log('✅ Seed concluído!')
    console.log('\n📋 Usuários criados (senha: senha123):')
    console.log('  admin@empresa.com         → ADMIN')
    console.log('  carla@empresa.com         → SOLICITANTE')
    console.log('  aprovador1@empresa.com    → APROVADOR (Grupo: Marketing Digital)')
    console.log('  aprovador2@empresa.com    → APROVADOR (Grupo: Crédito e Risco)')
    console.log('  juridico@empresa.com      → APROVADOR (Grupo Universal: Jurídico)')
}

main()
    .catch((e) => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
