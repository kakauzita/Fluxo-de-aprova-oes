/**
 * seed-unidades.ts
 * Importa as unidades da CAIXA para o banco de dados.
 * Execute com: npx ts-node prisma/seed-unidades.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const UNIDADES = [
    { codigo: '5361', sigla: 'GECRM', nome: 'Gerência de CRM' },
    { codigo: '5410', sigla: 'GEPUP', nome: 'Gerência de publicidade' },
    { codigo: '5132', sigla: 'GEEPF', nome: 'Gerência de estratégia de clientes PF' },
    { codigo: '5186', sigla: 'GEEPJ', nome: 'Gerência de estratégia de clientes PJ' },
    { codigo: '5130', sigla: 'GETAT', nome: 'Gerência de atendimento' },
    { codigo: '5515', sigla: 'GECAR', nome: 'Gerência de cartões' },
    { codigo: '5143', sigla: 'GENPF', nome: 'Gerência de crédito de PF' },
    { codigo: '5144', sigla: 'GENPJ', nome: 'Gerência de crédito de PJ' },
    { codigo: '5075', sigla: 'GENCO', nome: 'Gerência de Contas' },
]

async function main() {
    console.log('📦 Importando unidades...\n')
    for (const u of UNIDADES) {
        const unidade = await prisma.unidade.upsert({
            where: { codigo: u.codigo },
            create: { codigo: u.codigo, sigla: u.sigla, nome: u.nome },
            update: { sigla: u.sigla, nome: u.nome },
        })
        console.log(`  ✅ ${unidade.codigo} – ${unidade.sigla} – ${unidade.nome}`)
    }
    console.log('\n✅ Importação concluída!')
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
