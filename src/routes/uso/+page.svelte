<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import Download from '@lucide/svelte/icons/download';
	import FileText from '@lucide/svelte/icons/file-text';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import AvisoRad from '$lib/AvisoRad.svelte';
	import EtiquetaAmbiente from '$lib/EtiquetaAmbiente.svelte';
	import GraficaUso from '$lib/GraficaUso.svelte';
	import {
		DESCRIPCION_RESULTADO,
		NOMBRE_ESTADO_LLAVE,
		NOMBRE_RESULTADO,
		RESULTADOS,
		duracion,
		entero,
		fechaHora,
		fechaHoraSeg,
		nombreLlave,
		porcentaje,
		tamano,
		tipoArchivo,
		type EstadoLlave,
		type FilaResumen,
		type FilaUso,
		type Resultado
	} from '$lib/rad';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const COLOR: Record<Resultado, string> = {
		procesado: 'var(--uso-procesado)',
		no_procesado: 'var(--uso-no-procesado)',
		error: 'var(--uso-error)'
	};

	type Elegidos = typeof data.elegidos;
	/** /uso con los filtros de ahora más los cambios; el periodo por omisión (7d) no se escribe. */
	function enlace(cambios: Partial<Elegidos>) {
		const e = { ...data.elegidos, ...cambios };
		const q = new URLSearchParams();
		for (const [k, v] of Object.entries(e)) if (v && !(k === 'periodo' && v === '7d')) q.set(k, v);
		const s = q.toString();
		return s ? `/uso?${s}` : '/uso';
	}
	const filtrar = (cambios: Partial<Elegidos>) =>
		goto(enlace(cambios), { noScroll: true, keepFocus: true });

	const hayFiltros = $derived(!!(data.elegidos.llave || data.elegidos.endpoint || data.elegidos.resultado));
	const recargando = $derived(navigating.to?.url.pathname === '/uso');

	/** El filtro `llave` de una fila de «por llave»: su id, o su estado si no tiene llave registrada. */
	const llaveDeFila = (f: FilaResumen) => (f.api_key_id != null ? String(f.api_key_id) : (f.llave ?? ''));

	// Peticiones recientes: la primera página viene del load; «Cargar más» pide las siguientes.
	// Son $derived con escritura: si cambian los filtros (nuevo `data`), vuelven a la primera página.
	let filas = $derived<FilaUso[]>(data.uso.filas);
	let siguiente = $derived<number | null>(data.uso.siguiente);
	let cargando = $state(false);
	let errorMas = $state('');

	/** Falla con un mensaje de RAD que ya se puede mostrar. */
	class ErrorFilas extends Error {}

	/** Agrega la página siguiente de peticiones. Regresa false si la sesión venció (ya se fue al login). */
	async function traerSiguiente(limite = 50) {
		const q = new URLSearchParams(page.url.search);
		q.set('antes_de', String(siguiente));
		q.set('limite', String(limite));
		const res = await fetch(`/uso/filas?${q}`);
		if (!res.headers.get('content-type')?.includes('json')) {
			location.href = '/login'; // la sesión venció: el guard respondió con el login
			return false;
		}
		const j = await res.json();
		if (!res.ok) throw new ErrorFilas(j.error ?? 'No se pudieron cargar más.');
		filas = [...filas, ...j.filas];
		siguiente = j.siguiente;
		return true;
	}

	async function cargarMas() {
		if (siguiente == null) return;
		cargando = true;
		errorMas = '';
		try {
			await traerSiguiente();
		} catch (e) {
			errorMas = e instanceof ErrorFilas ? e.message : 'No se pudieron cargar más.';
		} finally {
			cargando = false;
		}
	}

	// --- Exportar -------------------------------------------------------------------------------
	// CSV: lo arma el servidor con TODAS las peticiones de estos filtros (/uso/csv).
	// PDF: se imprime esta misma página, con los estilos de @media print (sin barras ni filtros y
	// con un encabezado de reporte). Antes se traen las peticiones que falten, hasta LIMITE_PDF.
	const LIMITE_PDF = 5000;
	const NOMBRE_AMBIENTE = { prod: 'Producción', dev: 'Desarrollo', local: 'Local' } as const;
	const csvHref = $derived('/uso/csv' + page.url.search);
	let preparandoPdf = $state(false);
	let errorPdf = $state('');
	let generadoEn = $state(new Date().toISOString());

	/** Días que cubre el reporte (AAAA-MM-DD, hora de México), para el nombre del archivo. */
	const dias = $derived.by(() => {
		const primero = data.cubetas[0]?.clave.slice(0, 10) ?? data.desde.slice(0, 10);
		const ultimo = data.cubetas.at(-1)?.clave.slice(0, 10) ?? primero;
		return primero === ultimo ? primero : `${primero} a ${ultimo}`;
	});

	async function exportarPdf() {
		preparandoPdf = true;
		errorPdf = '';
		try {
			while (siguiente != null && filas.length < LIMITE_PDF)
				if (!(await traerSiguiente(Math.min(1000, LIMITE_PDF - filas.length)))) return;
			generadoEn = new Date().toISOString();
			await tick();
			// Chrome y Edge proponen el título de la página como nombre del PDF.
			const titulo = document.title;
			document.title = `Uso RAD - ${NOMBRE_AMBIENTE[data.ambiente]} - ${dias}`;
			window.print();
			document.title = titulo;
		} catch (e) {
			errorPdf = e instanceof ErrorFilas ? e.message : 'No se pudo preparar el PDF.';
		} finally {
			preparandoPdf = false;
		}
	}

	/** Los filtros de la página, dichos en palabras para el encabezado del PDF. */
	const filtrosEnPalabras = $derived.by(() => {
		const e = data.elegidos;
		const partes: string[] = [];
		if (e.llave) {
			const l = data.llaves.find((x) => String(x.id) === e.llave);
			partes.push(l ? `llave de ${l.cliente} (${l.prefijo}…)` : NOMBRE_ESTADO_LLAVE[e.llave as EstadoLlave]);
		}
		if (e.endpoint) partes.push(e.endpoint);
		if (e.resultado) partes.push(NOMBRE_RESULTADO[e.resultado as Resultado]);
		return partes.length ? partes.join(' · ') : 'Ninguno: todas las peticiones';
	});

	const nombrePeriodo = $derived(data.periodos.find((p) => p.id === data.elegidos.periodo)?.nombre ?? '');
	const maxPorLlave = $derived(Math.max(1, ...data.porLlave.map((f) => f.peticiones)));
	const maxPorEndpoint = $derived(Math.max(1, ...data.porEndpoint.map((f) => f.peticiones)));
	const confianza = (c: number | null) => (c == null ? '' : `${Math.round(c * 100)} %`);
	const categoria = (c: string | null) => (c ? [...new Set(c.split(','))].join(', ') : '—');
</script>

<svelte:head><title>Uso · RAD View</title></svelte:head>

<div class="flex flex-col gap-6 py-2">
	<div class="no-imprimir flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold">Uso</h1>
			<p class="max-w-3xl text-sm text-muted-foreground">
				Cada petición a un endpoint de documentos de RAD (<code class="codigo">/procesa_*</code>), con la
				llave que trajo, el resultado y cuánto tardó. Días y horas en hora del centro de México.
			</p>
		</div>
		<div class="flex flex-col items-end gap-1">
			<div class="flex gap-2">
				<!-- reload y sin precarga: es una descarga, no una página, y armarla cuesta. -->
				<Button
					href={csvHref}
					variant="outline"
					size="sm"
					title="Todas las peticiones con estos filtros, para Excel"
					data-sveltekit-reload
					data-sveltekit-preload-data="off"
				>
					<Download class="size-4" /> Exportar CSV
				</Button>
				<Button
					variant="outline"
					size="sm"
					title="Este reporte tal como se ve, para guardar como PDF"
					onclick={exportarPdf}
					disabled={preparandoPdf}
				>
					<FileText class="size-4" />
					{preparandoPdf ? 'Preparando…' : 'Exportar PDF'}
				</Button>
			</div>
			{#if errorPdf}<p class="text-sm text-destructive">{errorPdf}</p>{/if}
		</div>
	</div>

	<!-- Encabezado del reporte: solo en el PDF, en lugar del título y los filtros. -->
	<header class="solo-impresion reporte">
		<div class="reporte-arriba">
			<div>
				<p class="reporte-marca">RAD View · administración de RAD</p>
				<h1 class="reporte-titulo">Reporte de uso de RAD</h1>
			</div>
			<EtiquetaAmbiente ambiente={data.ambiente} />
		</div>
		<dl class="reporte-datos">
			<div>
				<dt>Periodo</dt>
				<dd>Del {fechaHora(data.desde)} al {fechaHora(generadoEn)} (hora del centro de México)</dd>
			</div>
			<div>
				<dt>Filtros</dt>
				<dd>{filtrosEnPalabras}</dd>
			</div>
			<div>
				<dt>Generado</dt>
				<dd>{fechaHora(generadoEn)}{data.usuario ? ` por ${data.usuario.usuario}` : ''}</dd>
			</div>
		</dl>
	</header>

	<!-- Filtros: una sola fila arriba; afectan todo lo de abajo. Sin JS, el formulario hace lo mismo. -->
	<form method="GET" action="/uso" class="filtros no-imprimir" data-sveltekit-noscroll data-sveltekit-keepfocus>
		<div class="periodos" role="group" aria-label="Periodo">
			{#each data.periodos as p (p.id)}
				<a
					href={enlace({ periodo: p.id })}
					class:activo={p.id === data.elegidos.periodo}
					aria-current={p.id === data.elegidos.periodo ? 'true' : undefined}
					data-sveltekit-noscroll
				>
					{p.nombre}
				</a>
			{/each}
		</div>
		<input type="hidden" name="periodo" value={data.elegidos.periodo} />

		<select
			name="llave"
			aria-label="Llave"
			value={data.elegidos.llave}
			onchange={(e) => filtrar({ llave: e.currentTarget.value })}
		>
			<option value="">Todas las llaves</option>
			{#if data.llaves.length}
				<optgroup label="Clientes">
					{#each data.llaves as l (l.id)}
						<option value={String(l.id)}>
							{l.cliente} · {l.prefijo}{l.revocada ? ' (revocada)' : ''}
						</option>
					{/each}
				</optgroup>
			{/if}
			<optgroup label="Por estado de la llave">
				{#each Object.entries(NOMBRE_ESTADO_LLAVE) as [valor, nombre] (valor)}
					<option value={valor}>{nombre}</option>
				{/each}
			</optgroup>
		</select>

		<select
			name="endpoint"
			aria-label="Endpoint"
			value={data.elegidos.endpoint}
			onchange={(e) => filtrar({ endpoint: e.currentTarget.value })}
		>
			<option value="">Todos los endpoints</option>
			{#each data.endpoints as ep (ep)}
				<option value={ep}>{ep}</option>
			{/each}
		</select>

		<select
			name="resultado"
			aria-label="Resultado"
			value={data.elegidos.resultado}
			onchange={(e) => filtrar({ resultado: e.currentTarget.value })}
		>
			<option value="">Todos los resultados</option>
			{#each RESULTADOS as r (r)}
				<option value={r}>{NOMBRE_RESULTADO[r]}</option>
			{/each}
		</select>

		<noscript><Button type="submit" variant="outline" size="sm">Filtrar</Button></noscript>
		{#if hayFiltros}
			<a class="limpiar" href={enlace({ llave: '', endpoint: '', resultado: '' })} data-sveltekit-noscroll>
				Quitar filtros
			</a>
		{/if}
	</form>

	{#if data.error}
		<AvisoRad mensaje={data.error} />
	{/if}

	<div class="flex flex-col gap-6 transition-opacity" class:opacity-50={recargando}>
		<!-- Cifras del periodo -->
		<div class="cifras">
			<div class="cifra">
				<p class="etiqueta">Peticiones · {nombrePeriodo.toLowerCase()}</p>
				<p class="valor">{entero(data.total)}</p>
			</div>
			{#each RESULTADOS as r (r)}
				<a class="cifra enlace" href={enlace({ resultado: data.elegidos.resultado === r ? '' : r })} title={DESCRIPCION_RESULTADO[r]} data-sveltekit-noscroll>
					<p class="etiqueta"><span class="punto" style:background={COLOR[r]}></span>{NOMBRE_RESULTADO[r]}</p>
					<p class="valor">{entero(data.totales[r])}</p>
					<p class="nota">{porcentaje(data.totales[r], data.total)} del total</p>
				</a>
			{/each}
			<div class="cifra">
				<p class="etiqueta">Tiempo promedio</p>
				<p class="valor">{duracion(data.msPromedio)}</p>
				<p class="nota">por petición</p>
			</div>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Peticiones por {data.agrupar === 'hora' ? 'hora' : 'día'}</Card.Title>
				<Card.Description>{nombrePeriodo}, apiladas por resultado.</Card.Description>
			</Card.Header>
			<Card.Content>
				<GraficaUso cubetas={data.cubetas} agrupar={data.agrupar} />
			</Card.Content>
		</Card.Root>

		<div class="pares grid gap-6 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Por llave</Card.Title>
					<Card.Description>Quién llama.<span class="no-imprimir"> Clic en una fila para filtrar por ella.</span></Card.Description>
				</Card.Header>
				<Card.Content>
					{#if data.porLlave.length === 0}
						<p class="vacio">Sin peticiones.</p>
					{:else}
						<Table.Root>
							<Table.Body>
								{#each data.porLlave as f (`${f.api_key_id}-${f.llave}`)}
									<Table.Row>
										<Table.Cell class="w-full whitespace-normal">
											<a class="fila-enlace" href={enlace({ llave: llaveDeFila(f) })} data-sveltekit-noscroll>
												<span class="font-medium">{nombreLlave(f)}</span>
												{#if f.prefijo}<code class="codigo">{f.prefijo}…</code>{/if}
												{#if f.llave === 'revocada'}<span class="etiqueta-mini">revocada</span>{/if}
											</a>
											<div class="barrita"><span style:width="{(f.peticiones / maxPorLlave) * 100}%"></span></div>
										</Table.Cell>
										<Table.Cell class="text-right tabular-nums">
											<div class="font-medium">{entero(f.peticiones)}</div>
											<div class="text-xs text-muted-foreground">{porcentaje(f.peticiones, data.total)}</div>
										</Table.Cell>
										<Table.Cell class="text-right text-xs text-muted-foreground">
											<span title="Última petición">{fechaHora(f.ultima)}</span>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Por endpoint</Card.Title>
					<Card.Description>Qué documentos se procesan y cuánto tarda cada uno.</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if data.porEndpoint.length === 0}
						<p class="vacio">Sin peticiones.</p>
					{:else}
						<Table.Root>
							<Table.Body>
								{#each data.porEndpoint as f (f.endpoint)}
									<Table.Row>
										<Table.Cell class="w-full">
											<a class="fila-enlace" href={enlace({ endpoint: f.endpoint })} data-sveltekit-noscroll>
												<code class="codigo">{f.endpoint}</code>
											</a>
											<div class="barrita"><span style:width="{(f.peticiones / maxPorEndpoint) * 100}%"></span></div>
										</Table.Cell>
										<Table.Cell class="text-right tabular-nums">
											<div class="font-medium">{entero(f.peticiones)}</div>
											<div class="text-xs text-muted-foreground">{porcentaje(f.peticiones, data.total)}</div>
										</Table.Cell>
										<Table.Cell class="text-right text-xs text-muted-foreground tabular-nums">
											<span title="Tiempo promedio">{duracion(f.ms_promedio)}</span>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- items-start: la lista de códigos es larga y no debe estirar la tarjeta de junto -->
		<div class="pares grid items-start gap-6 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Por código de resultado</Card.Title>
					<Card.Description>El <code class="codigo">codigo</code> que RAD devolvió en el sobre (o el status HTTP en los endpoints viejos).</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if data.porCodigo.length === 0}
						<p class="vacio">Sin peticiones.</p>
					{:else}
						<Table.Root>
							<Table.Body>
								{#each data.porCodigo as f (`${f.codigo}-${f.status_http}`)}
									<Table.Row>
										<Table.Cell class="tabular-nums">
											<span class="punto" style:background={COLOR[f.resultado ?? 'procesado']}></span>
											{f.codigo ?? f.status_http}
										</Table.Cell>
										<Table.Cell class="w-full whitespace-normal">
											{#if f.estado}<code class="codigo">{f.estado}</code>{:else}<span class="text-muted-foreground">HTTP {f.status_http}, sin sobre</span>{/if}
										</Table.Cell>
										<Table.Cell class="text-right tabular-nums">
											<div class="font-medium">{entero(f.peticiones)}</div>
											<div class="text-xs text-muted-foreground">{porcentaje(f.peticiones, data.total)}</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>

			{#if data.sinLlave}
				<Card.Root>
					<Card.Header>
						<Card.Title>Quién llama sin llave</Card.Title>
						<Card.Description>
							A quienes hay que entregar una llave antes de que RAD la exija, por IP y programa.
						</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if data.sinLlave.length === 0}
							<p class="vacio">Nadie en este periodo.</p>
						{:else}
							<Table.Root>
								<Table.Body>
									{#each data.sinLlave as f (`${f.ip}-${f.agente}`)}
										<Table.Row>
											<Table.Cell class="w-full whitespace-normal">
												<div class="font-medium tabular-nums">{f.ip ?? '—'}</div>
												<div class="text-xs break-all text-muted-foreground">{f.agente ?? 'sin User-Agent'}</div>
											</Table.Cell>
											<Table.Cell class="text-right tabular-nums font-medium">{entero(f.peticiones)}</Table.Cell>
											<Table.Cell class="text-right text-xs text-muted-foreground">
												<span title="Última petición">{fechaHora(f.ultima)}</span>
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}
		</div>

		<Card.Root class="se-parte">
			<Card.Header>
				<Card.Title>Peticiones</Card.Title>
				<Card.Description>Las más recientes primero. Nada del contenido del documento: solo cómo fue la petición.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3">
				{#if filas.length === 0}
					<p class="vacio">Sin peticiones con estos filtros.</p>
				{:else}
					<Table.Root class="peticiones">
						<Table.Header>
							<Table.Row>
								<Table.Head>Fecha</Table.Head>
								<Table.Head>Llave</Table.Head>
								<Table.Head>Endpoint</Table.Head>
								<Table.Head>Resultado</Table.Head>
								<Table.Head class="text-right">Tiempo</Table.Head>
								<Table.Head>Archivo</Table.Head>
								<Table.Head>Clasificador</Table.Head>
								<Table.Head>IP</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each filas as f (f.id)}
								<Table.Row>
									<Table.Cell class="tabular-nums">{fechaHoraSeg(f.fecha)}</Table.Cell>
									<Table.Cell>
										<span class:text-muted-foreground={!f.cliente}>{nombreLlave(f)}</span>
										{#if f.prefijo}<code class="codigo ml-1">{f.prefijo}…</code>{/if}
										{#if f.llave === 'revocada'}<span class="etiqueta-mini">revocada</span>{/if}
									</Table.Cell>
									<Table.Cell><code class="codigo">{f.endpoint}</code></Table.Cell>
									<Table.Cell title={f.estado ?? `HTTP ${f.status_http}`}>
										<span class="punto" style:background={COLOR[f.resultado]}></span>
										<span class="tabular-nums">{f.codigo ?? f.status_http}</span>
										{#if f.estado}<span class="ml-1 text-xs text-muted-foreground">{f.estado}</span>{/if}
									</Table.Cell>
									<Table.Cell class="text-right tabular-nums">{duracion(f.ms)}</Table.Cell>
									<Table.Cell class="text-muted-foreground">
										{#if f.mime}{(f.archivos ?? 1) > 1 ? `${f.archivos} × ` : ''}{tipoArchivo(f.mime)} · {/if}{tamano(f.bytes)}
									</Table.Cell>
									<Table.Cell class="text-muted-foreground">
										{categoria(f.categoria)}
										{#if f.confianza != null}<span class="tabular-nums"> · {confianza(f.confianza)}</span>{/if}
									</Table.Cell>
									<Table.Cell class="tabular-nums text-muted-foreground" title={f.agente ?? ''}>{f.ip ?? '—'}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
					<div class="flex items-center gap-3">
						{#if siguiente != null}
							<Button class="no-imprimir" variant="outline" size="sm" onclick={cargarMas} disabled={cargando}>
								{cargando ? 'Cargando…' : 'Cargar más'}
							</Button>
						{/if}
						<span class="text-xs text-muted-foreground">
							{entero(filas.length)} de {entero(data.total)}
						</span>
						{#if siguiente != null}
							<span class="solo-impresion text-xs text-muted-foreground">
								· Este PDF trae las {entero(filas.length)} más recientes; «Exportar CSV» las trae todas.
							</span>
						{/if}
						{#if errorMas}<span class="text-sm text-destructive">{errorMas}</span>{/if}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>

<style>
	.filtros {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.periodos {
		display: inline-flex;
		padding: 3px;
		gap: 2px;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		background: var(--card);
	}
	.periodos a {
		padding: 0.25rem 0.7rem;
		border-radius: 0.45rem;
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--muted-foreground);
		white-space: nowrap;
	}
	.periodos a:hover {
		background: var(--muted);
		color: var(--foreground);
	}
	.periodos a.activo {
		background: var(--primary);
		color: var(--primary-foreground);
	}
	select {
		height: 2.1rem;
		max-width: 100%;
		padding: 0 2rem 0 0.7rem;
		border: 1px solid var(--input);
		border-radius: 0.6rem;
		background-color: var(--card);
		font-size: 0.82rem;
		color: var(--foreground);
		cursor: pointer;
	}
	select:focus-visible {
		outline: none;
		border-color: var(--ring);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 50%, transparent);
	}
	.limpiar {
		font-size: 0.82rem;
		color: var(--primary);
	}
	.limpiar:hover {
		text-decoration: underline;
	}
	.cifras {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.75rem;
	}
	@media (max-width: 1100px) {
		.cifras {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (max-width: 640px) {
		.cifras {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.cifra {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.9rem 1rem;
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		background: var(--card);
		box-shadow: var(--shadow-sm);
	}
	.cifra.enlace:hover {
		border-color: var(--ring);
	}
	.cifra .etiqueta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		color: var(--muted-foreground);
	}
	.cifra .valor {
		font-size: 1.6rem;
		font-weight: 600;
		line-height: 1.2;
		color: var(--foreground);
	}
	.cifra .nota {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}
	.punto {
		display: inline-block;
		width: 0.55rem;
		height: 0.55rem;
		margin-right: 0.35rem;
		border-radius: 999px;
		vertical-align: 0.05em;
	}
	.cifra .punto {
		margin-right: 0;
	}
	.codigo {
		font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
		font-size: 0.8em;
		padding: 0.1em 0.35em;
		border-radius: 0.3rem;
		background: var(--muted);
		color: var(--foreground);
		white-space: nowrap;
	}
	.fila-enlace {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}
	.fila-enlace:hover .font-medium,
	.fila-enlace:hover .codigo {
		color: var(--primary);
	}
	.etiqueta-mini {
		margin-left: 0.3rem;
		padding: 0 0.35rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		font-size: 0.7rem;
		color: var(--muted-foreground);
	}
	.barrita {
		height: 4px;
		margin-top: 0.4rem;
		border-radius: 2px;
		background: var(--muted);
	}
	.barrita span {
		display: block;
		height: 100%;
		border-radius: 2px;
		background: var(--primary);
	}
	.vacio {
		padding: 1.25rem 0;
		text-align: center;
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	/* --- Encabezado del reporte (solo PDF) --- */
	.reporte {
		padding-bottom: 0.9rem;
		border-bottom: 2px solid var(--primary);
	}
	.reporte-arriba {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}
	.reporte-marca {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--primary);
	}
	.reporte-titulo {
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1.25;
	}
	.reporte-datos {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
		margin-top: 0.75rem;
		font-size: 0.8rem;
	}
	.reporte-datos dt {
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted-foreground);
	}

	/* --- PDF: hoja carta horizontal, para que la tabla de peticiones quepa a lo ancho --- */
	@page {
		size: letter landscape;
		margin: 12mm;
	}
	@media print {
		/* La hoja mide menos que los cortes de pantalla: se fija aquí cómo se acomoda. */
		.cifras {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}
		.pares {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.cifra {
			box-shadow: none;
			break-inside: avoid;
		}
		/* La tarjeta de peticiones sí se parte entre hojas (el encabezado de la tabla se repite). */
		:global([data-slot='card'].se-parte) {
			break-inside: auto;
		}
		:global([data-slot='table-container']) {
			overflow: visible;
		}
		:global(table.peticiones) {
			font-size: 0.68rem;
		}
		:global(table.peticiones th),
		:global(table.peticiones td) {
			padding: 0.25rem 0.4rem;
			white-space: normal;
		}
		:global(table.peticiones tr) {
			break-inside: avoid;
		}
	}
</style>
