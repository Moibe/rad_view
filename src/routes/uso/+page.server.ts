import { listarLlaves, listarUso, mensajeDeError, resumirUso } from '$lib/server/rad';
import { leerFiltros, PERIODOS } from '$lib/server/filtros-uso';
import {
	RESULTADOS,
	type Cubeta,
	type FilaResumen,
	type Llave,
	type PaginaUso,
	type Resultado
} from '$lib/rad';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const { rango, filtros, elegidos } = leerFiltros(url);
	// «Quién llama sin llave» solo tiene sentido si el filtro no es ya una llave concreta.
	const verSinLlave = !filtros.api_key_id && (!filtros.llave || filtros.llave === 'sin_llave');

	// `desde`: el inicio real del periodo, para el encabezado del PDF.
	const base = { elegidos, periodos: PERIODOS, agrupar: rango.agrupar, desde: rango.desde };
	try {
		const [serie, porLlave, porEndpoint, porCodigo, sinLlave, uso, llaves, endpoints] =
			await Promise.all([
				resumirUso([rango.agrupar, 'resultado'], filtros),
				resumirUso(['cliente', 'llave'], filtros),
				resumirUso(['endpoint'], filtros),
				resumirUso(['codigo', 'status', 'resultado'], filtros),
				verSinLlave
					? resumirUso(['ip', 'agente'], { ...filtros, llave: 'sin_llave' })
					: Promise.resolve(null),
				listarUso(filtros),
				listarLlaves(),
				resumirUso(['endpoint']) // opciones del filtro: todos los que ha visto RAD
			]);

		// Una cubeta por hora/día del periodo, también las vacías, con el conteo por resultado.
		const cubetas: Cubeta[] = rango.cubetas.map((clave) => ({
			clave,
			procesado: 0,
			no_procesado: 0,
			error: 0
		}));
		const indice = new Map(cubetas.map((c) => [c.clave, c]));
		const totales = { procesado: 0, no_procesado: 0, error: 0 } as Record<Resultado, number>;
		let msTotal = 0;
		for (const f of serie) {
			const r = f.resultado!;
			const c = indice.get((f[rango.agrupar] ?? '') as string);
			if (c) c[r] += f.peticiones;
			totales[r] += f.peticiones;
			msTotal += (f.ms_promedio ?? 0) * f.peticiones;
		}
		const total = RESULTADOS.reduce((s, r) => s + totales[r], 0);

		const orden = (a: FilaResumen, b: FilaResumen) => b.peticiones - a.peticiones;
		return {
			...base,
			error: null as string | null,
			cubetas,
			totales,
			total,
			msPromedio: total ? Math.round(msTotal / total) : null,
			porLlave: porLlave.sort(orden),
			porEndpoint: porEndpoint.sort(orden),
			porCodigo: porCodigo.sort(orden),
			sinLlave: sinLlave?.sort(orden) ?? null,
			uso,
			llaves,
			endpoints: endpoints.map((e) => e.endpoint!).sort()
		};
	} catch (e) {
		return {
			...base,
			error: mensajeDeError(e),
			cubetas: [] as Cubeta[],
			totales: { procesado: 0, no_procesado: 0, error: 0 } as Record<Resultado, number>,
			total: 0,
			msPromedio: null as number | null,
			porLlave: [] as FilaResumen[],
			porEndpoint: [] as FilaResumen[],
			porCodigo: [] as FilaResumen[],
			sinLlave: null as FilaResumen[] | null,
			uso: { filas: [], siguiente: null } as PaginaUso,
			llaves: [] as Llave[],
			endpoints: [] as string[]
		};
	}
};
