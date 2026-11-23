// Lee los filtros de /uso de la URL y los traduce a lo que entiende /admin/uso de RAD. Lo
// comparten la página (+page.server.ts) y el «Cargar más» (/uso/filas).
import { OFFSET_MIN, RESULTADOS, type EstadoLlave, type Resultado } from '$lib/rad';
import type { FiltrosUso } from './rad';

export const PERIODOS = [
	{ id: 'hoy', nombre: 'Hoy' },
	{ id: '7d', nombre: '7 días' },
	{ id: '30d', nombre: '30 días' },
	{ id: '90d', nombre: '90 días' }
] as const;
export type Periodo = (typeof PERIODOS)[number]['id'];

const DIAS: Record<Exclude<Periodo, 'hoy'>, number> = { '7d': 7, '30d': 30, '90d': 90 };
const ESTADOS_LLAVE: EstadoLlave[] = ['valida', 'sin_llave', 'invalida', 'revocada'];
const HORA = 3_600_000;
const DIA = 24 * HORA;

/** Desde cuándo pedir y en qué cubetas pintar: horas de hoy, o días (hora del centro de México,
 *  la misma con que RAD corta `dia` y `hora`). Las claves son las que devuelve RAD. */
export function rango(periodo: Periodo, ahora = Date.now()) {
	const off = OFFSET_MIN * 60_000;
	const local = ahora + off; // milisegundos "locales" contados como si fueran UTC
	const hoy = Math.floor(local / DIA) * DIA;
	const clave = (ms: number, largo: number) => new Date(ms).toISOString().slice(0, largo);

	if (periodo === 'hoy') {
		const horas = Math.floor((local - hoy) / HORA) + 1;
		return {
			desde: new Date(hoy - off).toISOString(),
			agrupar: 'hora' as const,
			cubetas: Array.from({ length: horas }, (_, h) => clave(hoy + h * HORA, 13))
		};
	}
	const n = DIAS[periodo];
	const inicio = hoy - (n - 1) * DIA;
	return {
		desde: new Date(inicio - off).toISOString(),
		agrupar: 'dia' as const,
		cubetas: Array.from({ length: n }, (_, i) => clave(inicio + i * DIA, 10))
	};
}

export function leerFiltros(url: URL) {
	const p = url.searchParams;
	const periodo: Periodo = PERIODOS.some((x) => x.id === p.get('periodo'))
		? (p.get('periodo') as Periodo)
		: '7d';

	// `llave` es el id de una llave o uno de los estados (sin_llave, invalida…).
	const llave = p.get('llave') ?? '';
	const llaveId = /^\d+$/.test(llave) ? Number(llave) : undefined;
	const llaveEstado = ESTADOS_LLAVE.includes(llave as EstadoLlave) ? (llave as EstadoLlave) : undefined;

	const endpoint = (p.get('endpoint') ?? '').trim();
	const resultado = RESULTADOS.includes(p.get('resultado') as Resultado)
		? (p.get('resultado') as Resultado)
		: undefined;

	const r = rango(periodo);
	const filtros: FiltrosUso = {
		desde: r.desde,
		api_key_id: llaveId,
		llave: llaveEstado,
		endpoint: endpoint.startsWith('/procesa_') ? endpoint : undefined,
		resultado
	};
	return {
		periodo,
		rango: r,
		filtros,
		elegidos: {
			periodo,
			llave: llaveId !== undefined || llaveEstado ? llave : '',
			endpoint: filtros.endpoint ?? '',
			resultado: resultado ?? ''
		}
	};
}
