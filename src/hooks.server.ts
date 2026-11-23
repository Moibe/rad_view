import { redirect, type Handle } from '@sveltejs/kit';
import {
	COOKIE_SESION,
	validarTokenSesion,
	ponerCookieSesion,
	borrarCookieSesion
} from '$lib/server/auth';

// Lo único que se puede ver sin sesión. Los archivos de static/ y los de /_app/ (el JS y el CSS
// del propio login) no pasan por este hook: los sirve adapter-node (o Vite en dev) antes.
const RUTAS_PUBLICAS = new Set(['/login']);

// Rellena locals.usuario y es el guard de TODA la app. Tiene que vivir aquí y no en un
// +layout.server.ts: el load de un layout solo corre al pintar una página, pero una form action
// (POST /ruta?/accion) o un +server.ts se ejecutan sin pasar por él. De aquí no se salta nada.
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.usuario = null;
	event.locals.sesion = null;

	const token = event.cookies.get(COOKIE_SESION);
	if (token) {
		const { sesion, usuario } = await validarTokenSesion(token);
		if (sesion && usuario) {
			ponerCookieSesion(event.cookies, token, sesion.expiraEn); // mantiene la cookie al día
			event.locals.usuario = usuario;
			event.locals.sesion = sesion;
		} else {
			borrarCookieSesion(event.cookies);
		}
	}

	// SvelteKit adapta el redirect a cada tipo de petición: 303 normal, o JSON de redirect para
	// los __data.json (navegación en el cliente) y para las actions enviadas con use:enhance.
	if (!event.locals.usuario && !RUTAS_PUBLICAS.has(event.url.pathname)) redirect(303, '/login');

	return resolve(event);
};
