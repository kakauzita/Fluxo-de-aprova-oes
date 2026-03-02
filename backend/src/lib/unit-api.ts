// Simulated Unit Validation API
// In production, this would call an internal HR/directory service

interface UnidadeInfo {
    codigo: string
    nome: string
}

// Mock registry
const UNIDADES_VALIDAS: Record<string, string> = {
    'UN001': 'Unidade São Paulo',
    'UN002': 'Unidade Rio de Janeiro',
    'UN003': 'Unidade Belo Horizonte',
    'UN004': 'Unidade Curitiba',
    'UN005': 'Unidade Porto Alegre',
    'UN006': 'Agência Centro',
    'UN007': 'Agência Norte',
    'UN008': 'Agência Sul',
    'UN009': 'Unidade Jurídica',
    'UN010': 'Compliance & Risco',
}

export async function validarUnidade(codigo: string): Promise<UnidadeInfo | null> {
    // Simulate async API call
    await new Promise(resolve => setTimeout(resolve, 50))

    const nome = UNIDADES_VALIDAS[codigo.toUpperCase()]
    if (!nome) return null

    return { codigo: codigo.toUpperCase(), nome }
}
