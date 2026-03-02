import { z } from 'zod';
type CanalTipo = 'SMS' | 'PUSH' | 'WHATSAPP' | 'EMAIL' | 'BANNER_APP';
export declare const ConteudoSMS: z.ZodObject<{
    mensagem: z.ZodString;
}, z.core.$strip>;
export declare const ConteudoPush: z.ZodObject<{
    titulo: z.ZodString;
    corpo: z.ZodString;
    urlDestino: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ConteudoWhatsApp: z.ZodObject<{
    templateId: z.ZodString;
    variaveis: z.ZodRecord<z.ZodString, z.ZodString>;
}, z.core.$strip>;
export declare const ConteudoEmail: z.ZodObject<{
    assunto: z.ZodString;
    corpoHtml: z.ZodString;
    remetente: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ConteudoBannerApp: z.ZodObject<{
    imagemUrl: z.ZodString;
    titulo: z.ZodOptional<z.ZodString>;
    urlDestino: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare function getConteudoSchema(canal: CanalTipo): z.ZodObject<{
    mensagem: z.ZodString;
}, z.core.$strip> | z.ZodObject<{
    titulo: z.ZodString;
    corpo: z.ZodString;
    urlDestino: z.ZodOptional<z.ZodString>;
}, z.core.$strip> | z.ZodObject<{
    templateId: z.ZodString;
    variaveis: z.ZodRecord<z.ZodString, z.ZodString>;
}, z.core.$strip> | z.ZodObject<{
    assunto: z.ZodString;
    corpoHtml: z.ZodString;
    remetente: z.ZodOptional<z.ZodString>;
}, z.core.$strip> | z.ZodObject<{
    imagemUrl: z.ZodString;
    titulo: z.ZodOptional<z.ZodString>;
    urlDestino: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export {};
//# sourceMappingURL=conteudo-schemas.d.ts.map