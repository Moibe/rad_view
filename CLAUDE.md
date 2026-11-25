# RAD View

Panel web para **administrar RAD**, la API de reconocimiento de documentos del repo
[`Moibe/document_ai`](https://github.com/Moibe/document_ai) (local: `c:/Moibe/code/document_ai`).
Primer alcance pedido por Moibe (2026-11-23): **generar las API keys de los clientes de RAD y ver su uso**.

> Este repo es **público**: nada de IPs internas, llaves, ids de proyecto de GCP ni nombres de clientes
> en lo que se commitea. Esos datos viven en el `.env` (gitignoreado) o en la memoria del agente.

## Estado (2026-11-23)

Hecho y verificado (check + build limpios; login/logout probados con curl y con capturas en escritorio y móvil):

- Scaffold SvelteKit 2 + Svelte 5 + TS, **adapter-node**, puerto local **4900** (`strictPort`).
- Tailwind v4 + **shadcn-svelte**. Componentes ya agregados: `button input label card table badge alert-dialog`.
  Más: `npx shadcn-svelte@latest add <comp> -y`.
- **Look blanco de NexusDoc / Biblioratum y buzzword-agentes-ui** (pedido de Moibe, 2026-11-23, en lugar
  del glass gris que traía el scaffold): tokens de `nexus_poc_svelte/src/app.css` en `:root` de `app.css`
  (fondo `#fcfcfc`, tarjetas blancas, bordes `#e2e8f0`, acento `#4268fb`), fuente Plus Jakarta Sans
  (`@fontsource`), íconos `@lucide/svelte`. Tema claro: `app.html` ya NO lleva `class="dark"` (el bloque
  `.dark` es el oscuro de nexus, sin interruptor todavía). `TopNav` y `Sidebar` colapsable (Inicio /
  API keys / Uso) son barras blancas pegadas al borde con borde fino; lo activo va en azul sólido, como
  las pestañas de buzzword. Colores siempre por token (`text-muted-foreground`, `text-destructive`…),
  nunca `text-white/…` ni hex sueltos.
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
- **`/keys` y `/uso` hechos** (2026-11-23), contra RAD `/admin` desde el servidor (`$lib/server/rad.ts`,
  que traduce cada falla de RAD a un mensaje para `AvisoRad`; la página se pinta igual, vacía):
  - `/keys`: generar (cliente + nota), lista con peticiones/último uso, revocar con `AlertDialog` (nunca
    `confirm()`). Generar y revocar **solo admin** (lo revisa cada action). La llave completa llega solo en
    la respuesta de la action y se guarda en el estado de la página (no en `form`: la siguiente action la
    borraría); se va con «Ya la guardé», al salir o recargar. Copiar: `navigator.clipboard` solo existe
    en https/localhost; en `http://IP` cae a `execCommand('copy')` sobre el campo.
  - `/uso`: filtros en la URL (`periodo` hoy/7d/30d/90d, `llave` = id o estado, `endpoint`, `resultado`;
    los lee `$lib/server/filtros-uso.ts`), cifras, gráfica apilada por resultado (`GraficaUso.svelte`, SVG
    a mano: por hora si es hoy, por día si no; tooltip con hover y flechas, «Ver como tabla»), por llave,
    por endpoint, por código, quién llama sin llave (IP + User-Agent) y las peticiones con «Cargar más»
    (`/uso/filas`, mismos filtros + `antes_de` + `limite` ≤ 1000). Colores de la gráfica en `--uso-*` de `app.css`.
  - **Exportar** (2026-11-25), con los filtros de la página:
    - **CSV** (`/uso/csv`): todas las filas, que pide a RAD de 1000 en 1000. Va en UTF-8 con BOM para Excel,
      con fecha en hora de México y en UTC. Los textos que empiezan con `= + - @` (el User-Agent lo manda
      quien llama) llevan un `'` delante para que Excel no los tome como fórmula.
    - **PDF**: imprime la misma página (`window.print()`). Antes trae todas las peticiones, hasta 5000.
      Los estilos de impresión ocultan las barras y los filtros y muestran el encabezado del reporte
      (periodo, filtros en palabras, quién y cuándo). El título de la página se cambia para que el PDF se
      llame `Uso RAD - <ambiente> - <días>`.
      - La hoja es **carta VERTICAL** (`@page` en `/uso`, márgenes de 10 mm). Primero se hizo horizontal y
        salía de lado: la impresora y "Microsoft Print to PDF" usan papel vertical y Chrome giraba cada
        hoja. **No volver a horizontal.**
      - En papel la tabla de peticiones va con letra chica y celdas que se parten en dos renglones; las
        unidades llevan `whitespace-nowrap` para no separar «1.9» de «MB».
      - Al imprimir, la gráfica se **redibuja al ancho del papel** (`anchoImpresion` de `GraficaUso`,
        `ANCHO_GRAFICA_PAPEL` = 714 px, con `beforeprint`/`afterprint` + `flushSync`). Escalada desde la
        pantalla, los ejes quedaban de unos 7 px. Si cambian los márgenes de `@page` o el relleno de las
        tarjetas en papel, hay que recalcular ese número.
      - Utilidades en `app.css`: `.solo-impresion` / `.no-imprimir`. En papel las tarjetas llevan `border`
        y no su `ring`: el ring es un box-shadow por fuera y deja una rayita al pie de la hoja anterior.
      - Se probó generando el PDF con Chromium y revisándolo hoja por hoja: todas carta vertical, sin
        `/Rotate`.
- **Etiqueta de ambiente** en el header y en el login (`EtiquetaAmbiente.svelte`) más una franja de color
  arriba de la TopNav: Producción en rojo, Desarrollo en ámbar, Local en gris. La decide
  `$lib/server/ambiente.ts`: `AMBIENTE` del `.env` si está; si no, `npm run dev` → local, `PORT` 4901 → dev,
  4902 → prod (por eso funciona sin tocar los `.env` del server).
  - Horas: todo en hora del centro de México (`ZONA`/`OFFSET_MIN` de `$lib/rad.ts`), igual que RAD.
  - Íconos de lucide por archivo (`@lucide/svelte/icons/x`), no del barril: el barril hace que Vite
    reoptimice todo el paquete y recargue la página a media prueba.

Pendiente: gestión de usuarios del panel (alta/baja; hoy solo existe el admin del seed).

## Correr en local

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed:admin     # admin / admin si ADMIN_* van vacías → cámbiala en /mi-cuenta
npm run dev               # http://localhost:4900
```

Para `/keys` y `/uso` hace falta un RAD local: en `document_ai`,
`venv/Scripts/python -m uvicorn app:app --port 8000`, con el mismo `RAD_ADMIN_TOKEN` en los dos `.env`
(en este equipo ya está puesto; `RAD_DB=<ruta>` para usar una base de prueba en vez de su `rad.db`).

Cambias el schema → `npm run db:generate` (commitea la migración de `drizzle/`) → `npm run db:migrate`.

## Despliegue (server interno de CSI, vía webhook-central)

App **nueva de CSI → empieza SOLO en DEV** (política de Moibe): rama `dev`, `PROJECT_BRANCH="dev"`, en
`apps.json` de webhook-central `"branch": "dev"`, `"env": "dev"` y sin `merge_url`. Modelo:
`constructor-agente-rag` / `inventario-ti`. Puertos: **dev 4901**, **prod 4902** (cuando se promueva).
**Desplegada en DEV desde 2026-11-23**: checkout `~/code/rad_view-dev`, pm2 `rad-view-dev`, puerto 4901
(responde desde la red de la oficina), registrada en webhook-central como `rad_view-dev` (hook
`despliegue-rad_view-dev`, pestaña Dev). El `.env` del server ya trae `RAD_URL=http://127.0.0.1:8102` y
`RAD_ADMIN_TOKEN` (el mismo que el `.env` de `document_ai-dev`; `/admin` de RAD dev ya responde 401 sin
token y 200 con él).

Restricciones del server (verificadas en inventario-ti): **Node 20.20.2**. Por eso aquí se fijó
`@sveltejs/kit@^2`, `@sveltejs/adapter-node@^5` y `better-sqlite3@^12`, y se borró el `.npmrc`
(`engine-strict`). **No subir a Kit 3 / adapter-node 6 / better-sqlite3 13**: truenan en Node 20.

Registro en webhook-central (repo `webhook-central`, commit `010cead`): `projects/rad_view-dev.conf`
(`APP_STACK=svelte`, rama `dev`, `POST_BUILD="npm run db:migrate && npm run db:seed:admin"`, el seed es
idempotente), su hook en `hooks.json` y su fila `env: dev` en `apps.json`, sin `merge_url`. El `.env`
del checkout lleva `DATABASE_URL`, `PORT=4901`, `HOST=0.0.0.0`, `ORIGIN=http://<ip>:4901`,
`ADMIN_USER`/`ADMIN_PASSWORD`, `RAD_URL`, `RAD_ADMIN_TOKEN`. Desde ahora, desplegar = push a `dev` +
el cohete (o `POST /hooks/despliegue-rad_view-dev`).

## Lo que hay que saber de RAD (document_ai)

- FastAPI en Python, Google Document AI detrás. En el server: pm2 `document-ai-api` (prod, rama `main`,
  puerto 8099) y `document-ai-api-dev` (rama `dev`, 8102); gunicorn con UvicornWorker.
- Endpoints con "sobre" (`codigo`/`estado`/`mensaje` en toda respuesta): `/procesa_ine/`,
  `/procesa_ine_atras/`, `/procesa_ine_ambas/`, `/procesa_pasaporte/`, `/procesa_cedula_panama/`.
  Viejos sin sobre: `/procesa_fm/`, `/procesa_csf/`, `/procesa_cedula/`. Códigos en `codigos.py`
  (200/210/211/212 procesado; 220-228 rechazos; 4xx/5xx errores).
- Antes de la fase 1 (abajo) RAD no tenía autenticación ni registraba una línea por petición: solo
  logs de texto de pm2. En **prod (`main`) sigue así** hasta que se promueva la fase 1.

## Keys y uso: decidido A (Moibe, 2026-11-23) — fase 1 hecha en RAD `dev`

**Fase 1 (observación) hecha**: document_ai `dev`, commit `91cb662`, desplegado a `document-ai-api-dev`
(8102) y verificado (responde; `/admin/*` da 503 porque aún no hay token; prod 8099 intacto). Probado
con `TestClient` y el clasificador simulado (sin gastar Document AI): 7 caminos de petición, llaves
válida/inválida/revocada/ausente, paginación, resumen, 401/503, admin fuera de Swagger.

- `uso.py` (RAD): SQLite propia `rad.db` junto a `app.py` (o `RAD_DB`), WAL. Tabla `api_keys` (`id`,
  `prefijo` visible tipo `rad_Ab3dE9xQ`, `hash` SHA-256, `cliente`, `nota`, `creada`, `revocada`) y `uso`
  (una fila por `POST /procesa_*`: `fecha` ISO UTC con `Z`, `api_key_id`, `llave` = `valida` /
  `sin_llave` / `invalida` / `revocada`, `endpoint` sin diagonal final, `status_http`, `codigo`/`estado`
  del sobre (null en los endpoints viejos y en el 500 inesperado), `ms`, `bytes`, `archivos`, `mime`,
  `categoria`, `confianza`, `ip`, `agente`). `X-API-Key` es **opcional**: nada se rechaza por la llave.
- `admin.py` (RAD), `Authorization: Bearer <RAD_ADMIN_TOKEN>`; sin token en el `.env` de RAD → 503:
  - `GET /admin/keys` → `{llaves:[{id,prefijo,cliente,nota,creada,revocada,peticiones,ultimo_uso}]}`
  - `POST /admin/keys` `{cliente, nota?}` → 201 con la llave completa en `llave` (**única vez**)
  - `POST /admin/keys/{id}/revocar` → la llave (no se borra; revocar dos veces conserva la 1.ª fecha)
  - `GET /admin/uso?desde&hasta&api_key_id&llave&endpoint&resultado&antes_de&limite` → `{filas, siguiente}`
    (nuevas primero; siguiente página con `antes_de=siguiente`; `desde` incluye, `hasta` excluye, ISO UTC;
    cada fila trae su `resultado`)
  - `GET /admin/uso/resumen?agrupar=…&offset_min=-360` (+ los mismos filtros) →
    `{filas:[{…grupo, peticiones, ms_promedio, primera, ultima}]}`. `agrupar` combina `dia`, `hora`
    (`AAAA-MM-DDTHH`), `cliente`, `llave`, `endpoint`, `codigo`, `status`, `resultado`, `ip`, `agente`;
    `dia`/`hora` cortados en hora de México.
  - `resultado` = `procesado` (200/21x, o 2xx sin sobre) / `no_procesado` (22x) / `error` (HTTP ≥ 400):
    una sola definición en SQL (`uso._RESULTADO_SQL`), para agrupar, filtrar y marcar filas. Agregado
    en document_ai `dev` con lo de `hora` y `agente` (2026-11-23).
- Para saber a quién repartir llaves: resumen con `llave=sin_llave&agrupar=ip,agente`.

**Siguiente**: (a) ~~token de admin en el server y en local~~ hecho 2026-11-23; (b) ~~construir `/keys` y
`/uso`~~ hecho 2026-11-23; (c) fase 2, repartir llaves (la tarjeta «Quién llama sin llave» de `/uso` dice
a quién); (d) fase 3,
exigirlas (pendiente en RAD: rechazar sin llave detrás de un flag, con el sobre de siempre). Promover
RAD a `main` cuando Moibe lo pida.

### Por qué A (la decisión)

- **A. RAD es dueño de keys y uso** (la elegida). document_ai gana su propia SQLite con `api_keys`
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
