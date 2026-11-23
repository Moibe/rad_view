import type { LayoutServerLoad } from './$types';

// El guard (sin sesión → /login) vive en hooks.server.ts; aquí solo se pasa quién está dentro.
// `url` se lee a propósito: así SvelteKit vuelve a pedir este load en CADA navegación del cliente
// y cada navegación pasa por el guard. Sin eso el load se queda en caché, y si la sesión muere a
// medio uso el login se pinta dentro de las barras con el usuario viejo (o ni se nota al ir a una
// página sin load propio, como /uso).
export const load: LayoutServerLoad = async ({ locals, url }) => {
	void url.pathname;
	return { usuario: locals.usuario };
};
