export const ALLOWED_FOLDERS = ['categorias', 'cursos', 'galaxias', 'planetas'] as const;
export type AllowedFolder = typeof ALLOWED_FOLDERS[number];