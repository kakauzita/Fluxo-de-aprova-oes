"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnprocessableError = exports.ForbiddenError = exports.NotFoundError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 400, code) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(entity, id) {
        super(id ? `${entity} '${id}' não encontrado.` : `${entity} não encontrado.`, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class ForbiddenError extends AppError {
    constructor(message = 'Acesso negado.') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
class UnprocessableError extends AppError {
    constructor(message) {
        super(message, 422, 'UNPROCESSABLE');
    }
}
exports.UnprocessableError = UnprocessableError;
//# sourceMappingURL=errors.js.map