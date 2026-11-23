import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Guard de toda la app: sin sesión no se ve nada salvo el login.
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.usuario && url.pathname !== '/login') redirect(303, '/login');
	return { usuario: locals.usuario };
};
