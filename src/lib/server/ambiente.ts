// En qué ambiente corre este panel, para la etiqueta del header. Manda AMBIENTE del .env
// (prod | dev | local); si no está, se deduce: `npm run dev` es local, y en el server de CSI
// cada ambiente tiene su puerto fijo (4901 dev, 4902 prod). Así funciona sin tocar los .env.
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import type { Ambiente } from '$lib/tipos';

const VALIDOS: Ambiente[] = ['prod', 'dev', 'local'];
const POR_PUERTO: Record<string, Ambiente> = { '4901': 'dev', '4902': 'prod' };

export function ambiente(): Ambiente {
	const dicho = (env.AMBIENTE ?? '').trim().toLowerCase() as Ambiente;
	if (VALIDOS.includes(dicho)) return dicho;
	if (dev) return 'local';
	return POR_PUERTO[(env.PORT ?? '').trim()] ?? 'local';
}
