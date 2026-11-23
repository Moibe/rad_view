import type { Cookies } from '@sveltejs/kit';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { usuarios, sesiones } from '$lib/server/db/schema';
import type { UsuarioSesion } from '$lib/tipos';

export type { UsuarioSesion };

// Mismo patrón de auth que shape_up / inventario-ti: scrypt para contraseñas y
// sesiones con token aleatorio; sin JWT ni librerías externas.

// cookies.set() de SvelteKit pone `secure` en true salvo que el host sea
// literalmente "localhost". En el server de CSI se entra por IP y puerto sin TLS,
// así que el navegador tiraría la cookie en silencio y el login rebotaría sin
// ningún error visible. Se deriva de ORIGIN: https:// conserva Secure, http:// no.
const COOKIES_SEGURAS = (process.env.ORIGIN ?? '').startsWith('https://');

const DIA = 1000 * 60 * 60 * 24;
const DURACION_SESION = 30 * DIA;
const UMBRAL_RENOVACION = 15 * DIA; // se extiende cuando queda menos que esto
export const COOKIE_SESION = 'sesion';

// ── Contraseñas (scrypt, "salHex:hashHex") ──────────────────────────────────
export function hashContrasena(contrasena: string): string {
	const sal = randomBytes(16);
	return `${sal.toString('hex')}:${scryptSync(contrasena, sal, 64).toString('hex')}`;
}

export function verificarContrasena(contrasena: string, guardado: string | null): boolean {
	if (!guardado) return false;
	const [salHex, hashHex] = guardado.split(':');
	if (!salHex || !hashHex) return false;
	const hash = scryptSync(contrasena, Buffer.from(salHex, 'hex'), 64);
	const esperado = Buffer.from(hashHex, 'hex');
	return hash.length === esperado.length && timingSafeEqual(hash, esperado);
}

// ── Sesiones ────────────────────────────────────────────────────────────────
export function generarTokenSesion(): string {
	return randomBytes(32).toString('base64url');
}

// La cookie lleva el token crudo; la base solo guarda su SHA-256, así que ni con
// la base en la mano se puede suplantar a alguien.
const idSesion = (token: string) => createHash('sha256').update(token).digest('hex');

export async function crearSesion(token: string, usuarioId: number) {
	const id = idSesion(token);
	const expiraEn = Date.now() + DURACION_SESION;
	await db.insert(sesiones).values({ id, usuarioId, expiraEn });
	return { id, usuarioId, expiraEn };
}

export async function validarTokenSesion(token: string): Promise<{
	sesion: { id: string; usuarioId: number; expiraEn: number } | null;
	usuario: UsuarioSesion | null;
}> {
	const id = idSesion(token);
	const [fila] = await db.select().from(sesiones).where(eq(sesiones.id, id));
	if (!fila) return { sesion: null, usuario: null };

	if (Date.now() >= fila.expiraEn) {
		await db.delete(sesiones).where(eq(sesiones.id, id));
		return { sesion: null, usuario: null };
	}

	let expiraEn = fila.expiraEn;
	if (Date.now() >= fila.expiraEn - UMBRAL_RENOVACION) {
		expiraEn = Date.now() + DURACION_SESION;
		await db.update(sesiones).set({ expiraEn }).where(eq(sesiones.id, id));
	}

	const [u] = await db
		.select({ id: usuarios.id, usuario: usuarios.usuario, esAdmin: usuarios.esAdmin })
		.from(usuarios)
		.where(eq(usuarios.id, fila.usuarioId));
	if (!u) {
		await db.delete(sesiones).where(eq(sesiones.id, id));
		return { sesion: null, usuario: null };
	}

	return { sesion: { id, usuarioId: fila.usuarioId, expiraEn }, usuario: u };
}

export async function cerrarSesion(id: string) {
	await db.delete(sesiones).where(eq(sesiones.id, id));
}

export function ponerCookieSesion(cookies: Cookies, token: string, expiraEn: number) {
	cookies.set(COOKIE_SESION, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: COOKIES_SEGURAS,
		expires: new Date(expiraEn)
	});
}

// El borrado necesita el mismo `secure` que ponerCookieSesion: cookies.delete() también trae
// Secure por defecto (salvo en localhost), y en http:// el navegador ignora ese Set-Cookie, así
// que al Salir la cookie vieja se quedaba en el navegador.
export function borrarCookieSesion(cookies: Cookies) {
	cookies.delete(COOKIE_SESION, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: COOKIES_SEGURAS
	});
}
