"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConteudoBannerApp = exports.ConteudoEmail = exports.ConteudoWhatsApp = exports.ConteudoPush = exports.ConteudoSMS = void 0;
exports.getConteudoSchema = getConteudoSchema;
const zod_1 = require("zod");
const BaseSchema = {
    observacoes: zod_1.z.string().optional().or(zod_1.z.literal('')),
};
exports.ConteudoSMS = zod_1.z.object({
    ...BaseSchema,
    mensagem: zod_1.z.string().min(1).max(160),
});
exports.ConteudoPush = zod_1.z.object({
    ...BaseSchema,
    app: zod_1.z.string().optional(),
    titulo: zod_1.z.string().min(1).max(65),
    mensagem: zod_1.z.string().min(1).max(240),
    textoLink: zod_1.z.string().optional().or(zod_1.z.literal('')),
    urlDestino: zod_1.z.string().optional().or(zod_1.z.literal('')),
});
exports.ConteudoWhatsApp = zod_1.z.object({
    ...BaseSchema,
    titulo: zod_1.z.string().min(1).max(65),
    mensagem: zod_1.z.string().min(1).max(1024),
    textoLink: zod_1.z.string().optional().or(zod_1.z.literal('')),
    urlDestino: zod_1.z.string().optional().or(zod_1.z.literal('')),
});
exports.ConteudoEmail = zod_1.z.object({
    ...BaseSchema,
    assunto: zod_1.z.string().min(1),
    corpoHtml: zod_1.z.string().min(1),
});
exports.ConteudoBannerApp = zod_1.z.object({
    ...BaseSchema,
    titulo: zod_1.z.string().min(1).max(65),
    corpo: zod_1.z.string().min(1).max(240),
    textoLink: zod_1.z.string().optional().or(zod_1.z.literal('')),
    urlDestino: zod_1.z.string().optional().or(zod_1.z.literal('')),
});
function getConteudoSchema(canal) {
    const schemas = {
        SMS: exports.ConteudoSMS,
        PUSH: exports.ConteudoPush,
        WHATSAPP: exports.ConteudoWhatsApp,
        EMAIL: exports.ConteudoEmail,
        BANNER_APP: exports.ConteudoBannerApp,
    };
    return schemas[canal];
}
//# sourceMappingURL=conteudo-schemas.js.map