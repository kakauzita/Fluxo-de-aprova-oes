import { z } from 'zod'

type CanalTipo = 'SMS' | 'PUSH' | 'WHATSAPP' | 'EMAIL' | 'BANNER_APP'

const BaseSchema = {
    observacoes: z.string().optional().or(z.literal('')),
}

export const ConteudoSMS = z.object({
    ...BaseSchema,
    mensagem: z.string().min(1).max(160),
})

export const ConteudoPush = z.object({
    ...BaseSchema,
    app: z.string().optional(),
    titulo: z.string().min(1).max(65),
    mensagem: z.string().min(1).max(240),
    textoLink: z.string().optional().or(z.literal('')),
    urlDestino: z.string().optional().or(z.literal('')),
})

export const ConteudoWhatsApp = z.object({
    ...BaseSchema,
    titulo: z.string().min(1).max(65),
    mensagem: z.string().min(1).max(1024),
    textoLink: z.string().optional().or(z.literal('')),
    urlDestino: z.string().optional().or(z.literal('')),
})

export const ConteudoEmail = z.object({
    ...BaseSchema,
    assunto: z.string().min(1),
    corpoHtml: z.string().min(1),
})

export const ConteudoBannerApp = z.object({
    ...BaseSchema,
    titulo: z.string().min(1).max(65),
    corpo: z.string().min(1).max(240),
    textoLink: z.string().optional().or(z.literal('')),
    urlDestino: z.string().optional().or(z.literal('')),
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
