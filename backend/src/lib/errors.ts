export class AppError extends Error {
    constructor(
        public readonly message: string,
        public readonly statusCode: number = 400,
        public readonly code?: string,
    ) {
        super(message)
        this.name = 'AppError'
    }
}

export class NotFoundError extends AppError {
    constructor(entity: string, id?: string) {
        super(id ? `${entity} '${id}' não encontrado.` : `${entity} não encontrado.`, 404, 'NOT_FOUND')
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Acesso negado.') {
        super(message, 403, 'FORBIDDEN')
    }
}

export class UnprocessableError extends AppError {
    constructor(message: string) {
        super(message, 422, 'UNPROCESSABLE')
    }
}
