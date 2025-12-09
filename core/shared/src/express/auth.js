"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAuth = hasAuth;
exports.getAuth = getAuth;
exports.assertAuth = assertAuth;
/**
 * Проверяет наличие авторизованного пользователя в запросе.
 */
function hasAuth(req) {
    return req.user !== undefined;
}
/**
 * Безопасно возвращает контекст пользователя (undefined, если не авторизован).
 */
function getAuth(req) {
    return req.user;
}
/**
 * Гарантирует наличие авторизованного пользователя.
 * Бросает ошибку, чтобы вызывающий код решил, как вернуть 401/403.
 */
function assertAuth(req, message = 'Authentication required') {
    const user = req.user;
    if (!user) {
        throw new Error(message);
    }
    return user;
}
