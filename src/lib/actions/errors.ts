/**
 * Shared error type for server actions. Deliberately NOT in a "use server"
 * file — Next.js 16 requires every top-level export of a "use server"
 * module to be an async function, so this class lives on its own and gets
 * re-exported (as a type-safe value) from action modules that throw it.
 */
export class ActionError extends Error {}
