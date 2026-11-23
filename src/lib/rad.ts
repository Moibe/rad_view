// Lo que RAD (document_ai) devuelve en /admin, y cómo se presenta. Vive fuera de $lib/server
// porque los componentes también lo usan; las llamadas a RAD están en $lib/server/rad.ts.

export type Llave = {
	id: number;
	prefijo: string;
	cliente: string;
	nota: string | null;
	creada: string;
	revocada: string | null;
	peticiones: number;
	ultimo_uso: string | null;
};

/** La respuesta de POST /admin/keys: la única vez que existe la llave completa. */
export type LlaveNueva = Omit<Llave, 'peticiones' | 'ultimo_uso'> & { llave: string };

/** Estado de la llave con la que llegó cada petición. */
export type EstadoLlave = 'valida' | 'sin_llave' | 'invalida' | 'revocada';

/** Desenlace en tres cubetas; RAD lo define (uso.RESULTADOS) y lo trae en cada fila. */
export type Resultado = 'procesado' | 'no_procesado' | 'error';
export const RESULTADOS: Resultado[] = ['procesado', 'no_procesado', 'error'];

export const NOMBRE_RESULTADO: Record<Resultado, string> = {
	procesado: 'Procesadas',
	no_procesado: 'No procesadas',
	error: 'Errores'
};
export const DESCRIPCION_RESULTADO: Record<Resultado, string> = {
	procesado: 'Se extrajeron los datos (códigos 200 y 21x).',
	no_procesado: 'Se evaluó y no se pudo extraer: no era el documento, en blanco, dañado… (22x).',
	error: 'La petición falló: archivo no soportado, petición inválida, Document AI… (HTTP 4xx/5xx).'
};

export const NOMBRE_ESTADO_LLAVE: Record<EstadoLlave, string> = {
	valida: 'Con llave válida',
	sin_llave: 'Sin llave',
	invalida: 'Llave inválida',
	revocada: 'Llave revocada'
};

export type FilaUso = {
	id: number;
	fecha: string;
	api_key_id: number | null;
	llave: EstadoLlave;
	metodo: string;
	endpoint: string;
	status_http: number;
	codigo: number | null;
	estado: string | null;
	ms: number;
	bytes: number | null;
	archivos: number | null;
	mime: string | null;
	categoria: string | null;
	confianza: number | null;
	ip: string | null;
	agente: string | null;
	cliente: string | null;
	prefijo: string | null;
	resultado: Resultado;
};

export type PaginaUso = { filas: FilaUso[]; siguiente: number | null };

/** Una hora o un día de la gráfica: la clave es la de RAD ('AAAA-MM-DDTHH' o 'AAAA-MM-DD'). */
export type Cubeta = { clave: string } & Record<Resultado, number>;

/** Una fila de /admin/uso/resumen: las columnas del grupo pedido más los conteos. */
export type FilaResumen = {
	peticiones: number;
	ms_promedio: number | null;
	primera: string;
	ultima: string;
	dia?: string;
	hora?: string;
	api_key_id?: number | null;
	cliente?: string | null;
	prefijo?: string | null;
	llave?: EstadoLlave;
	endpoint?: string;
	codigo?: number | null;
	estado?: string | null;
	status_http?: number;
	resultado?: Resultado;
	ip?: string | null;
	agente?: string | null;
};

// --- presentación -----------------------------------------------------------------------------

/** RAD corta días y horas en la hora del centro de México (UTC-6 fijo: ya no hay horario de
 *  verano). El panel usa la misma zona para que las cuentas cuadren con las de RAD. */
export const ZONA = 'America/Mexico_City';
export const OFFSET_MIN = -360;

const fmtFechaHora = new Intl.DateTimeFormat('es-MX', {
	timeZone: ZONA,
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	hour12: false
});
const fmtFechaHoraSeg = new Intl.DateTimeFormat('es-MX', {
	timeZone: ZONA,
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hour12: false
});
const fmtFecha = new Intl.DateTimeFormat('es-MX', {
	timeZone: ZONA,
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});
const fmtEntero = new Intl.NumberFormat('es-MX');

export const fechaHora = (iso: string | null | undefined) => (iso ? fmtFechaHora.format(new Date(iso)) : '—');
export const fechaHoraSeg = (iso: string | null | undefined) =>
	iso ? fmtFechaHoraSeg.format(new Date(iso)) : '—';
export const fecha = (iso: string | null | undefined) => (iso ? fmtFecha.format(new Date(iso)) : '—');
export const entero = (n: number | null | undefined) => (n == null ? '—' : fmtEntero.format(n));

export function duracion(ms: number | null | undefined) {
	if (ms == null) return '—';
	if (ms < 1000) return `${ms} ms`;
	return `${(ms / 1000).toLocaleString('es-MX', { maximumFractionDigits: 1 })} s`;
}

export function tamano(bytes: number | null | undefined) {
	if (bytes == null) return '—';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toLocaleString('es-MX', { maximumFractionDigits: 1 })} MB`;
}

export function porcentaje(parte: number, total: number) {
	if (!total) return '—';
	const p = (parte / total) * 100;
	return `${p.toLocaleString('es-MX', { maximumFractionDigits: p < 10 ? 1 : 0 })} %`;
}

/** Nombre corto del tipo de archivo: 'image/jpeg' → 'JPEG', 'application/pdf' → 'PDF'. */
export function tipoArchivo(mime: string | null) {
	if (!mime) return '—';
	const tipos = [...new Set(mime.split(','))].map((m) => (m.split('/')[1] ?? m).toUpperCase());
	return tipos.join(', ');
}

/** Cómo se llama la llave de una fila: el cliente, o lo que pasó si no hay cliente. */
export function nombreLlave(f: { cliente?: string | null; llave?: EstadoLlave }) {
	if (f.cliente) return f.cliente;
	if (f.llave === 'invalida') return 'Llave inválida';
	if (f.llave === 'sin_llave') return 'Sin llave';
	return '—';
}
