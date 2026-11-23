import { json } from '@sveltejs/kit';
import { listarUso, mensajeDeError } from '$lib/server/rad';
import { leerFiltros } from '$lib/server/filtros-uso';
import type { RequestHandler } from './$types';

// «Cargar más» de la tabla de peticiones: la página siguiente con los mismos filtros de /uso.
// Pasa por el guard de hooks.server.ts como todo lo demás (sin sesión → /login).
export const GET: RequestHandler = async ({ url }) => {
	const antesDe = Number(url.searchParams.get('antes_de'));
	if (!Number.isInteger(antesDe) || antesDe <= 0) return json({ error: 'Falta antes_de.' }, { status: 400 });
	try {
		return json(await listarUso(leerFiltros(url).filtros, antesDe));
	} catch (e) {
		return json({ error: mensajeDeError(e) }, { status: 502 });
	}
};
