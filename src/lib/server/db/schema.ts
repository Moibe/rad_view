import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Cuentas de quienes administran RAD desde esta app (no son los clientes de la API).
export const usuarios = sqliteTable('usuarios', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	usuario: text('usuario').notNull().unique(),
	// scrypt "salHex:hashHex" (ver $lib/server/auth). null = cuenta sin activar.
	contrasenaHash: text('contrasena_hash'),
	esAdmin: integer('es_admin', { mode: 'boolean' }).notNull().default(false),
	creadoEn: integer('creado_en', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// La cookie lleva el token crudo; aquí solo vive su SHA-256 como id.
export const sesiones = sqliteTable('sesiones', {
	id: text('id').primaryKey(),
	usuarioId: integer('usuario_id')
		.notNull()
		.references(() => usuarios.id, { onDelete: 'cascade' }),
	// milisegundos desde epoch
	expiraEn: integer('expira_en').notNull()
});
