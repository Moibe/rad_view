// Cliente de /admin de RAD. Solo corre en el servidor de SvelteKit: el token de administración
// (RAD_ADMIN_TOKEN, el mismo valor que en el .env de RAD) nunca llega al navegador.
import { env } from '$env/dynamic/private';
import {
	OFFSET_MIN,
	type FilaResumen,
	type Llave,
	type LlaveNueva,
	type PaginaUso,
	type Resultado,
	type EstadoLlave
} from '$lib/rad';

/** Falla al hablar con RAD, con un mensaje que ya se puede mostrar en pantalla. */
export class ErrorRad extends Error {
	constructor(
		message: string,
		public status = 502
	) {
		super(message);
	}
}

export function mensajeDeError(e: unknown) {
	if (e instanceof ErrorRad) return e.message;
	console.error('[rad]', e);
	return 'Algo falló al hablar con RAD. Revisa el log del panel.';
}

async function pedir<T>(ruta: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
	const base = (env.RAD_URL ?? '').trim().replace(/\/+$/, '');
	const token = (env.RAD_ADMIN_TOKEN ?? '').trim();
	if (!base || !token)
		throw new ErrorRad('Falta RAD_URL o RAD_ADMIN_TOKEN en el .env del panel.', 500);

	let res: Response;
	try {
		res = await fetch(base + ruta, {
			method: init.method ?? 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/json',
				...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {})
			},
			body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
			signal: AbortSignal.timeout(15_000)
		});
	} catch (e) {
		console.error('[rad] sin conexión', base, e);
		throw new ErrorRad(`No se pudo conectar con RAD (${base}). ¿Está arriba?`);
	}

	if (res.ok) return (await res.json()) as T;

	let detalle = '';
	try {
		const cuerpo = await res.json();
		detalle = typeof cuerpo?.detail === 'string' ? cuerpo.detail : '';
	} catch {
		/* cuerpo que no es JSON: se queda el mensaje genérico */
	}
	if (res.status === 401)
		throw new ErrorRad('RAD rechazó el token: RAD_ADMIN_TOKEN no es el mismo aquí que en RAD.');
	if (res.status === 503)
		throw new ErrorRad(detalle || 'RAD tiene la administración apagada (sin RAD_ADMIN_TOKEN).');
	if (res.status === 404 && ruta.startsWith('/admin') && (!detalle || detalle === 'Not Found'))
		throw new ErrorRad('Ese RAD no tiene /admin: ¿RAD_URL apunta a una versión sin llaves?');
	throw new ErrorRad(detalle || `RAD respondió ${res.status}.`, res.status);
}

// --- llaves ---------------------------------------------------------------------------------------

export const listarLlaves = async () => (await pedir<{ llaves: Llave[] }>('/admin/keys')).llaves;

export const crearLlave = (cliente: string, nota: string | null) =>
	pedir<LlaveNueva>('/admin/keys', { method: 'POST', body: { cliente, nota } });

export const revocarLlave = (id: number) =>
	pedir<Omit<Llave, 'peticiones' | 'ultimo_uso'>>(`/admin/keys/${id}/revocar`, { method: 'POST' });

// --- uso ------------------------------------------------------------------------------------------

export type FiltrosUso = {
	desde?: string;
	hasta?: string;
	api_key_id?: number;
	llave?: EstadoLlave;
	endpoint?: string;
	resultado?: Resultado;
};

function query(valores: Record<string, string | number | undefined | null>) {
	const q = new URLSearchParams();
	for (const [k, v] of Object.entries(valores)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
	const s = q.toString();
	return s ? `?${s}` : '';
}

export const listarUso = (filtros: FiltrosUso, antesDe?: number | null, limite = 50) =>
	pedir<PaginaUso>('/admin/uso' + query({ ...filtros, antes_de: antesDe, limite }));

export const resumirUso = async (agrupar: string[], filtros: FiltrosUso = {}) =>
	(
		await pedir<{ filas: FilaResumen[] }>(
			'/admin/uso/resumen' + query({ ...filtros, agrupar: agrupar.join(','), offset_min: OFFSET_MIN })
		)
	).filas;
