interface Unidade {
    codigo: string;
    nome: string;
}
interface GrupoCalculado {
    id: string;
    nome: string;
    origem: 'SEGMENTO' | 'ASSUNTO' | 'UNIVERSAL';
    unidades: Unidade[];
}
/**
 * RN: Calcula os grupos que participarão de uma versão de peça,
 * sem duplicatas. A ordem é: SEGMENTO → ASSUNTO → UNIVERSAL.
 * Inclui as unidades que compõem cada grupo (codigo + nome).
 */
export declare function calcularGruposDaVersao(segmentoId: string, assuntoId: string): Promise<GrupoCalculado[]>;
export {};
//# sourceMappingURL=grupo-calculator.d.ts.map