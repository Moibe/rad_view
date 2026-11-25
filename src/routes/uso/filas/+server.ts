import { json } from '@sveltejs/kit';
import { listarUso, mensajeDeError } from '$lib/server/rad';
import { leerFiltros } from '$lib/server/filtros-uso';
import type { RequestHandler } from './$types';

// «Cargar más» de la tabla de peticiones: la página siguiente con los mismos filtros de /uso.
// `limite` (1-1000, lo más que da RAD) lo usa «Exportar PDF» para traer todo en pocas vueltas.
// Pasa por el guard de hooks.server.ts como todo lo demás (sin sesión → /login).
export const GET: RequestHandler = async ({ url }) => {
	const antesDe = Number(url.searchParams.get('antes_de'));
	if (!Number.isInteger(antesDe) || antesDe <= 0) return json({ error: 'Falta antes_de.' }, { status: 400 });
	const pedido = Number(url.searchParams.get('limite') ?? 50);
	const limite = Number.isInteger(pedido) ? Math.min(1000, Math.max(1, pedido)) : 50;
	try {
		return json(await listarUso(leerFiltros(url).filtros, antesDe, limite));
	} catch (e) {
		return json({ error: mensajeDeError(e) }, { status: 502 });
	}
};
