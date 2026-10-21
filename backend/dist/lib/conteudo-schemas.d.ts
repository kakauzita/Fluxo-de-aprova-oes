import { z } from 'zod';
type CanalTipo = 'SMS' | 'PUSH' | 'WHATSAPP' | 'EMAIL' | 'BANNER_APP';
export declare const ConteudoSMS: z.ZodObject<{
    mensagem: z.ZodString;
    observacoes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const ConteudoPush: z.ZodObject<{
    app: z.ZodOptional<z.ZodString>;
    titulo: z.ZodString;
    mensagem: z.ZodString;
    textoLink: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    urlDestino: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    observacoes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const ConteudoWhatsApp: z.ZodObject<{
    titulo: z.ZodString;
    mensagem: z.ZodString;
    textoLink: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    urlDestino: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    observacoes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const ConteudoEmail: z.ZodObject<{
    assunto: z.ZodString;
    corpoHtml: z.ZodString;
    observacoes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const ConteudoBannerApp: z.ZodObject<{
    titulo: z.ZodString;
    corpo: z.ZodString;
    textoLink: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    urlDestino: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    observacoes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare function getConteudoSchema(canal: CanalTipo): z.ZodObject<{
    mensagem: z.ZodString;
    observacoes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip> | z.ZodObject<{
    app: z.ZodOptional<z.ZodString>;
    titulo: z.ZodString;
    mensagem: z.ZodString;
    textoLink: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    urlDestino: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    observacoes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip> | z.ZodObject<{
    titulo: z.ZodString;
    mensagem: z.ZodString;
    textoLink: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    urlDestino: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    observacoes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip> | z.ZodObject<{
    assunto: z.ZodString;
    corpoHtml: z.ZodString;
    observacoes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip> | z.ZodObject<{
    titulo: z.ZodString;
    corpo: z.ZodString;
    textoLink: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    urlDestino: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    observacoes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export {};
//# sourceMappingURL=conteudo-schemas.d.ts.map