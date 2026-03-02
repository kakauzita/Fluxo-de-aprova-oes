import { prisma } from '../lib/prisma'

interface Unidade {
    codigo: string
    nome: string
}

interface GrupoCalculado {
    id: string
    nome: string
    origem: 'SEGMENTO' | 'ASSUNTO' | 'UNIVERSAL'
    unidades: Unidade[]
}

/**
 * RN: Calcula os grupos que participarão de uma versão de peça,
 * sem duplicatas. A ordem é: SEGMENTO → ASSUNTO → UNIVERSAL.
 * Inclui as unidades que compõem cada grupo (codigo + nome).
 */
export async function calcularGruposDaVersao(
    segmentoId: string,
    assuntoId: string,
): Promise<GrupoCalculado[]> {
    const gruposVistos = new Set<string>()
    const resultado: GrupoCalculado[] = []

    // helper: busca unidades de um grupo
    async function getUnidades(grupoId: string): Promise<Unidade[]> {
        const rows = await prisma.grupoUnidade.findMany({
            where: { grupoId },
            include: { unidade: { select: { codigo: true, nome: true } } },
        })
        return rows.map(r => ({ codigo: r.unidade.codigo, nome: r.unidade.nome }))
    }

    // 1. Grupos do segmento
    const segmentoGrupos = await prisma.segmentoGrupo.findMany({
        where: { segmentoId },
        include: { grupo: true },
    })
    for (const sg of segmentoGrupos) {
        if (!gruposVistos.has(sg.grupoId)) {
            gruposVistos.add(sg.grupoId)
            resultado.push({
                id: sg.grupoId,
                nome: sg.grupo.nome,
                origem: 'SEGMENTO',
                unidades: await getUnidades(sg.grupoId),
            })
        }
    }

    // 2. Grupos do assunto
    const assuntoGrupos = await prisma.assuntoGrupo.findMany({
        where: { assuntoId },
        include: { grupo: true },
    })
    for (const ag of assuntoGrupos) {
        if (!gruposVistos.has(ag.grupoId)) {
            gruposVistos.add(ag.grupoId)
            resultado.push({
                id: ag.grupoId,
                nome: ag.grupo.nome,
                origem: 'ASSUNTO',
                unidades: await getUnidades(ag.grupoId),
            })
        }
    }

    // 3. Grupos universais (RN-08)
    const universais = await prisma.grupoAprovadores.findMany({
        where: { isUniversal: true, ativo: true },
    })
    for (const u of universais) {
        if (!gruposVistos.has(u.id)) {
            gruposVistos.add(u.id)
            resultado.push({
                id: u.id,
                nome: u.nome,
                origem: 'UNIVERSAL',
                unidades: await getUnidades(u.id),
            })
        }
    }

    return resultado
}
