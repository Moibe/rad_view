# RAD View

Panel web para **administrar RAD**, la API de reconocimiento de documentos del repo
[`Moibe/document_ai`](https://github.com/Moibe/document_ai) (local: `c:/Moibe/code/document_ai`).
Primer alcance pedido por Moibe (2026-11-23): **generar las API keys de los clientes de RAD y ver su uso**.

> Este repo es **público**: nada de IPs internas, llaves, ids de proyecto de GCP ni nombres de clientes
> en lo que se commitea. Esos datos viven en el `.env` (gitignoreado) o en la memoria del agente.

## Estado (2026-11-23)

Hecho y verificado (check + build limpios; login/logout probados con curl y con capturas en escritorio y móvil):

- Scaffold SvelteKit 2 + Svelte 5 + TS, **adapter-node**, puerto local **4900** (`strictPort`).
- Tailwind v4 + **shadcn-svelte** (base `zinc`, modo oscuro fijo con `class="dark"` en `app.html`).
  Componentes ya agregados: `button input label card table badge`. Más: `npx shadcn-svelte@latest add <comp> -y`.
- Chrome glass de siempre: `TopNav` (cuenta + Salir) + `Sidebar` colapsable (Inicio / API keys / Uso),
  gradiente grafito `#475569 → #0f172a`. `--card` del tema oscuro es translúcido para que las tarjetas
  se vean de vidrio.
- **DB**: Drizzle ORM + better-sqlite3 (`local.db`). Migración inicial en `drizzle/` (commiteada).
- **Auth** (patrón shape_up / inventario-ti, sin librerías): scrypt + sesiones con token aleatorio (solo
  el SHA-256 en la tabla `sesiones`), cookie httpOnly; `Secure` solo si `ORIGIN` es `https://` (en el
  server de CSI se entra por IP sin TLS: con Secure el login rebota en silencio). Lo mismo al **borrarla**:
  `cookies.delete` también trae Secure por defecto, y en http:// el navegador ignoraba el borrado (al
  Salir la cookie se quedaba); `borrarCookieSesion` usa el mismo `secure` que `ponerCookieSesion`.
  Rutas: `/login`, `/logout` (POST), `/mi-cuenta` (cambiar contraseña).
  `npm run db:seed:admin` crea `admin` la primera vez (idempotente; `ADMIN_USER`/`ADMIN_PASSWORD` del `.env`).
- **Guard global en `src/hooks.server.ts`, NO en un layout**: el load de un `+layout.server.ts` no corre
  en form actions ni en `+server.ts` (comprobado: con el guard en el layout, una action sin sesión sí se
  ejecutaba). Las rutas públicas van en `RUTAS_PUBLICAS`. El `+layout.server.ts` raíz lee `url` a
  propósito para que cada navegación del cliente pase por el guard: sin eso, si la sesión muere a medio
  uso, el login se pinta dentro de las barras con el usuario viejo. Probado con el build de producción
  + Playwright. Ojo: el guard solo exige sesión; lo que sea solo para admin lo revisa cada action.
- `/keys` y `/uso` son **placeholders**: falta la decisión de arquitectura de abajo.

Pendiente: gestión de usuarios del panel (alta/baja; hoy solo existe el admin del seed), y todo lo de keys/uso.

## Correr en local

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed:admin     # admin / admin si ADMIN_* van vacías → cámbiala en /mi-cuenta
npm run dev               # http://localhost:4900
```

Cambias el schema → `npm run db:generate` (commitea la migración de `drizzle/`) → `npm run db:migrate`.

## Despliegue (server interno de CSI, vía webhook-central)

App **nueva de CSI → empieza SOLO en DEV** (política de Moibe): rama `dev`, `PROJECT_BRANCH="dev"`, en
`apps.json` de webhook-central `"branch": "dev"`, `"env": "dev"` y sin `merge_url`. Modelo:
`constructor-agente-rag` / `inventario-ti`. Puertos: **dev 4901**, **prod 4902** (cuando se promueva).
El puerto nuevo hay que pedirlo a redes de CSI (firewall por puerto).

Restricciones del server (verificadas en inventario-ti): **Node 20.20.2**. Por eso aquí se fijó
`@sveltejs/kit@^2`, `@sveltejs/adapter-node@^5` y `better-sqlite3@^12`, y se borró el `.npmrc`
(`engine-strict`). **No subir a Kit 3 / adapter-node 6 / better-sqlite3 13**: truenan en Node 20.

Registro en webhook-central (lo hace Moibe o el agente de webhook-central; es del lado del server):
`projects/rad_view-dev.conf` con `APP_STACK=svelte`, `PROJECT_BRANCH="dev"`, `PM2_NAME`, y
`POST_BUILD="npm run db:migrate"` (deploy.sh no corre migraciones). El `.env` del checkout lleva
`DATABASE_URL`, `PORT=4901`, `HOST=0.0.0.0`, `ORIGIN=http://<ip>:4901`. Primer `git clone`, primer
`npm run db:seed:admin` y primer `pm2 start build/index.js` son manuales.

## Lo que hay que saber de RAD (document_ai)

- FastAPI en Python, Google Document AI detrás. En el server: pm2 `document-ai-api` (prod, rama `main`,
  puerto 8099) y `document-ai-api-dev` (rama `dev`, 8102); gunicorn con UvicornWorker.
- Endpoints con "sobre" (`codigo`/`estado`/`mensaje` en toda respuesta): `/procesa_ine/`,
  `/procesa_ine_atras/`, `/procesa_ine_ambas/`, `/procesa_pasaporte/`, `/procesa_cedula_panama/`.
  Viejos sin sobre: `/procesa_fm/`, `/procesa_csf/`, `/procesa_cedula/`. Códigos en `codigos.py`
  (200/210/211/212 procesado; 220-228 rechazos; 4xx/5xx errores).
- **RAD hoy no tiene ninguna autenticación**: cualquiera en la red puede llamarlo.
- **RAD hoy no registra una línea por petición**. Solo logs de texto (`logging_config.py`) a
  stdout/stderr que pm2 guarda en `~/.pm2/logs/document-ai-api-{out,error}.log`, rotados a diario por
  pm2-logrotate. Ahí se ven las llamadas a Document AI y los rechazos (`Documento no procesado: NO_ES_INE`),
  pero NO el código con el que salió cada respuesta, ni 422/222/223/227/228, ni tiempos, ni quién llamó.
  O sea: **no hay de dónde sacar "uso" todavía**; hay que construirlo en RAD.

## Decisión pendiente: dónde viven las keys y el uso

Hay que decidirla con Moibe antes de construir `/keys` y `/uso`. Recomendación: **opción A**.

- **A. RAD es dueño de keys y uso** (recomendada). document_ai gana su propia SQLite con `api_keys`
  (solo el hash SHA-256 de la llave + un prefijo visible para identificarla, cliente, creada, revocada)
  y `uso` (una fila por petición: fecha, key, endpoint, `codigo`/`estado`, status HTTP, ms, MIME, tamaño,
  categoría y confianza del clasificador — **sin datos personales** del documento). Un middleware valida
  el header (p. ej. `X-API-Key`) y registra el uso donde ocurre la petición. RAD expone endpoints de admin
  (`/admin/keys`, `/admin/uso`) protegidos con un token de admin que vive en el `.env` de rad_view;
  rad_view es solo la UI que los consume desde el servidor (`+page.server.ts`, nunca desde el navegador).
  Ventajas: validar una llave no depende de que rad_view esté arriba, y no hay salto de red por petición.
- B. rad_view es dueño de las keys y RAD le pregunta en cada petición: si rad_view se cae, se cae RAD. No.
- C. Las dos apps comparten un archivo SQLite: acopla los esquemas de dos repos y mezcla escrituras. No.

**Cuidado con el despliegue de A**: activar la validación de llaves rompe de golpe a todos los clientes
actuales de RAD (nadie manda llave hoy). Hacerlo por fases: (1) registrar uso aceptando peticiones sin
llave ("modo observación"), (2) repartir llaves, (3) exigirlas. Y los cambios en RAD van primero a su
rama `dev` (`document-ai-api-dev`), no directo a `main`.

Una llave se muestra **una sola vez** al crearla (como GitHub); después solo se ve su prefijo.
