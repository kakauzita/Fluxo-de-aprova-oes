import { z } from 'zod'

type CanalTipo = 'SMS' | 'PUSH' | 'WHATSAPP' | 'EMAIL' | 'BANNER_APP'

// Schemas de conteúdo por canal
export const ConteudoSMS = z.object({
    mensagem: z.string().min(1).max(160),
})

export const ConteudoPush = z.object({
    titulo: z.string().min(1).max(65),
    corpo: z.string().min(1).max(240),
    urlDestino: z.string().url().optional(),
})

export const ConteudoWhatsApp = z.object({
    templateId: z.string().min(1),
    variaveis: z.record(z.string(), z.string()),
})

export const ConteudoEmail = z.object({
    assunto: z.string().min(1),
    corpoHtml: z.string().min(1),
    remetente: z.string().email().optional(),
})

export const ConteudoBannerApp = z.object({
    imagemUrl: z.string().url(),
    titulo: z.string().optional(),
    urlDestino: z.string().url().optional(),
})

export function getConteudoSchema(canal: CanalTipo) {
    const schemas = {
        SMS: ConteudoSMS,
        PUSH: ConteudoPush,
        WHATSAPP: ConteudoWhatsApp,
        EMAIL: ConteudoEmail,
        BANNER_APP: ConteudoBannerApp,
    } as const
    return schemas[canal as CanalTipo]
}
