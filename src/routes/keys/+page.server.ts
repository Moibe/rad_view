import { fail } from '@sveltejs/kit';
import { crearLlave, listarLlaves, mensajeDeError, revocarLlave } from '$lib/server/rad';
import type { Llave } from '$lib/rad';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const esAdmin = locals.usuario!.esAdmin;
	try {
		return { llaves: await listarLlaves(), error: null as string | null, esAdmin };
	} catch (e) {
		return { llaves: [] as Llave[], error: mensajeDeError(e), esAdmin };
	}
};

// Generar y revocar llaves es solo de admin (el guard de hooks.server.ts solo exige sesión).
export const actions: Actions = {
	crear: async ({ request, locals }) => {
		if (!locals.usuario?.esAdmin) return fail(403, { error: 'Solo un admin puede generar llaves.' });
		const fd = await request.formData();
		const cliente = String(fd.get('cliente') ?? '').trim();
		const nota = String(fd.get('nota') ?? '').trim();

		if (!cliente) return fail(400, { error: 'Escribe de qué cliente es la llave.', cliente, nota });
		if (cliente.length > 120)
			return fail(400, { error: 'El nombre del cliente admite hasta 120 caracteres.', cliente, nota });
		if (nota.length > 500) return fail(400, { error: 'La nota admite hasta 500 caracteres.', cliente, nota });

		try {
			// La llave completa solo viaja en ESTA respuesta: RAD guarda su hash, el panel no la guarda.
			return { nueva: await crearLlave(cliente, nota || null) };
		} catch (e) {
			return fail(502, { error: mensajeDeError(e), cliente, nota });
		}
	},

	revocar: async ({ request, locals }) => {
		if (!locals.usuario?.esAdmin)
			return fail(403, { errorRevocar: 'Solo un admin puede revocar llaves.' });
		const id = Number((await request.formData()).get('id'));
		if (!Number.isInteger(id) || id <= 0) return fail(400, { errorRevocar: 'Llave no válida.' });
		try {
			return { revocada: await revocarLlave(id) };
		} catch (e) {
			return fail(502, { errorRevocar: mensajeDeError(e) });
		}
	}
};
