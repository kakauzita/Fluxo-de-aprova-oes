"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConteudoBannerApp = exports.ConteudoEmail = exports.ConteudoWhatsApp = exports.ConteudoPush = exports.ConteudoSMS = void 0;
exports.getConteudoSchema = getConteudoSchema;
const zod_1 = require("zod");
// Schemas de conteúdo por canal
exports.ConteudoSMS = zod_1.z.object({
    mensagem: zod_1.z.string().min(1).max(160),
});
exports.ConteudoPush = zod_1.z.object({
    titulo: zod_1.z.string().min(1).max(65),
    corpo: zod_1.z.string().min(1).max(240),
    urlDestino: zod_1.z.string().url().optional(),
});
exports.ConteudoWhatsApp = zod_1.z.object({
    templateId: zod_1.z.string().min(1),
    variaveis: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
});
exports.ConteudoEmail = zod_1.z.object({
    assunto: zod_1.z.string().min(1),
    corpoHtml: zod_1.z.string().min(1),
    remetente: zod_1.z.string().email().optional(),
});
exports.ConteudoBannerApp = zod_1.z.object({
    imagemUrl: zod_1.z.string().url(),
    titulo: zod_1.z.string().optional(),
    urlDestino: zod_1.z.string().url().optional(),
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