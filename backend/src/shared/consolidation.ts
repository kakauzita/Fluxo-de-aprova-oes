import { Prisma, PrismaClient, VersaoStatus } from '@prisma/client'
import { prisma as globalPrisma } from '../lib/prisma'

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

/**
 * Engine de consolidação tardia (RN-04, RN-05).
 *
 * Só atua quando TODOS os grupos e unidades adicionais manifestaram.
 * Um único REPROVADO é suficiente para reprovar a peça (RN-05).
 */
export async function consolidar(versaoPecaId: string, tx: Tx = globalPrisma): Promise<void> {
    // Total de participantes = grupos registrados + unidades adicionais
    const totalGrupos = await tx.versaoGrupo.count({ where: { versaoPecaId } })
    const totalUniExtras = await tx.unidadeAdicional.count({ where: { versaoPecaId } })
    const totalParticipantes = totalGrupos + totalUniExtras

    if (totalParticipantes === 0) return

    // Total de manifestações registradas
    const totalManifestacoes = await tx.manifestacaoGrupo.count({ where: { versaoPecaId } })

    // Aguarda todos (RN-04)
    if (totalManifestacoes < totalParticipantes) return

    // Verifica se existe alguma reprovação (RN-05)
    const temReprovado = await tx.manifestacaoGrupo.findFirst({
        where: { versaoPecaId, decisao: 'REPROVADO' },
    })

    const novoVersaoStatus: VersaoStatus = temReprovado ? 'REPROVADA' : 'APROVADA'

    const versao = await tx.versaoPeca.findUniqueOrThrow({ where: { id: versaoPecaId } })

    // Atualiza versão
    await tx.versaoPeca.update({
        where: { id: versaoPecaId },
        data: { status: novoVersaoStatus, consolidadoEm: new Date() },
    })

    // Atualiza peça mestre (RN-06: REPROVADA volta para edição)
    await tx.peca.update({
        where: { id: versao.pecaId },
        data: { status: temReprovado ? 'REPROVADA' : 'APROVADA' },
    })

    // Registra evento de auditoria
    await tx.eventoHistorico.create({
        data: {
            pecaId: versao.pecaId,
            versaoPecaId,
            evento: temReprovado ? 'PECA_REPROVADA' : 'PECA_APROVADA',
            payload: { versaoNumero: versao.numeroVersao },
        },
    })
}
