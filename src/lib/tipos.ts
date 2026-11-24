/** Lo que la sesión sabe de quien está dentro. Vive fuera de $lib/server para
 *  que los componentes del navegador también puedan usar el tipo. */
/** Dónde corre el panel (etiqueta del header); lo decide $lib/server/ambiente. */
export type Ambiente = 'prod' | 'dev' | 'local';

export type UsuarioSesion = { id: number; usuario: string; esAdmin: boolean };
