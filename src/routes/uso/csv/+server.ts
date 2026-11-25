import { ambiente } from '$lib/server/ambiente';
import { leerFiltros } from '$lib/server/filtros-uso';
import { listarUso, mensajeDeError } from '$lib/server/rad';
import { ZONA, type EstadoLlave, type FilaUso, type Resultado } from '$lib/rad';
import type { RequestHandler } from './$types';

// «Exportar CSV» de /uso: TODAS las peticiones con los filtros de la página (no solo las que se
// ven), pidiéndolas a RAD de 1000 en 1000. Pensado para abrirse en Excel: UTF-8 con BOM (si no,
// los acentos salen rotos) y fechas en hora del centro de México, como en la pantalla.

const MAX_FILAS = 200_000; // tope de seguridad; 90 días de uso real quedan muy por debajo

const LLAVE: Record<EstadoLlave, string> = {
	valida: 'Válida',
	sin_llave: 'Sin llave',
	invalida: 'Inválida',
	revocada: 'Revocada'
};
const RESULTADO: Record<Resultado, string> = {
	procesado: 'Procesado',
	no_procesado: 'No procesado',
	error: 'Error'
};

// 'sv-SE' escribe la fecha como AAAA-MM-DD HH:MM:SS, que Excel reconoce como fecha y hora.
const fmtLocal = new Intl.DateTimeFormat('sv-SE', {
	timeZone: ZONA,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hour12: false
});

const COLUMNAS: [string, (f: FilaUso) => string | number | null][] = [
	['Fecha (hora de México)', (f) => fmtLocal.format(new Date(f.fecha))],
	['Fecha UTC', (f) => f.fecha],
	['Cliente', (f) => f.cliente],
	['Prefijo de la llave', (f) => f.prefijo],
	['Llave', (f) => LLAVE[f.llave] ?? f.llave],
	['Endpoint', (f) => f.endpoint],
	['Resultado', (f) => RESULTADO[f.resultado] ?? f.resultado],
	['Código', (f) => f.codigo],
	['Estado', (f) => f.estado],
	['HTTP', (f) => f.status_http],
	['Tiempo (ms)', (f) => f.ms],
	['Archivos', (f) => f.archivos],
	['Tipo de archivo', (f) => f.mime],
	['Bytes', (f) => f.bytes],
	['Categoría', (f) => f.categoria],
	['Confianza (%)', (f) => (f.confianza == null ? null : Math.round(f.confianza * 100))],
	['IP', (f) => f.ip],
	['User-Agent', (f) => f.agente]
];

function celda(v: string | number | null) {
	if (v == null) return '';
	if (typeof v === 'number') return String(v);
	// El User-Agent (y la IP) los manda quien llama a RAD: un texto que empiece con = + - @ Excel lo
	// tomaría como fórmula. Con un apóstrofo delante se queda como texto.
	const texto = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
	return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export const GET: RequestHandler = async ({ url }) => {
	const { filtros, rango } = leerFiltros(url);

	const filas: FilaUso[] = [];
	try {
		let antesDe: number | null | undefined;
		do {
			const pagina = await listarUso(filtros, antesDe, 1000);
			filas.push(...pagina.filas);
			antesDe = pagina.siguiente;
		} while (antesDe != null && filas.length < MAX_FILAS);
	} catch (e) {
		return new Response(`No se pudo exportar el CSV: ${mensajeDeError(e)}`, {
			status: 502,
			headers: { 'content-type': 'text/plain; charset=utf-8' }
		});
	}

	const lineas = [COLUMNAS.map(([nombre]) => celda(nombre)).join(',')];
	for (const f of filas) lineas.push(COLUMNAS.map(([, valor]) => celda(valor(f))).join(','));

	const primero = rango.cubetas[0]?.slice(0, 10) ?? '';
	const ultimo = rango.cubetas.at(-1)?.slice(0, 10) ?? '';
	const nombre = `uso-rad-${ambiente()}-${primero === ultimo ? primero : `${primero}_a_${ultimo}`}.csv`;

	return new Response('﻿' + lineas.join('\r\n') + '\r\n', {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${nombre}"`,
			'cache-control': 'no-store'
		}
	});
};
