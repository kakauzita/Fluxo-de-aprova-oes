export declare class AppError extends Error {
    readonly message: string;
    readonly statusCode: number;
    readonly code?: string | undefined;
    constructor(message: string, statusCode?: number, code?: string | undefined);
}
export declare class NotFoundError extends AppError {
    constructor(entity: string, id?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class UnprocessableError extends AppError {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map