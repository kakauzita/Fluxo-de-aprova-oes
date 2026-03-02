"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePerfil = requirePerfil;
const errors_1 = require("./errors");
function requirePerfil(...perfis) {
    return async (req, _reply) => {
        const user = req.user;
        if (!user || !perfis.includes(user.perfil)) {
            throw new errors_1.ForbiddenError(`Acesso restrito a: ${perfis.join(', ')}. Seu perfil: ${user?.perfil ?? 'desconhecido'}.`);
        }
    };
}
//# sourceMappingURL=permissions.js.map