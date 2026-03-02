import { PrismaClient } from '@prisma/client';
type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
/**
 * Engine de consolidação tardia (RN-04, RN-05).
 *
 * Só atua quando TODOS os grupos e unidades adicionais manifestaram.
 * Um único REPROVADO é suficiente para reprovar a peça (RN-05).
 */
export declare function consolidar(versaoPecaId: string, tx?: Tx): Promise<void>;
export {};
//# sourceMappingURL=consolidation.d.ts.map