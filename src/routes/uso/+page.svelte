<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import AvisoRad from '$lib/AvisoRad.svelte';
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

	async function cargarMas() {
		if (siguiente == null) return;
		cargando = true;
		errorMas = '';
		try {
			const q = new URLSearchParams(page.url.search);
			q.set('antes_de', String(siguiente));
			const res = await fetch(`/uso/filas?${q}`);
			if (!res.headers.get('content-type')?.includes('json')) {
				location.href = '/login'; // la sesión venció: el guard respondió con el login
				return;
			}
			const j = await res.json();
			if (!res.ok) {
				errorMas = j.error ?? 'No se pudieron cargar más.';
				return;
			}
			filas = [...filas, ...j.filas];
			siguiente = j.siguiente;
		} catch {
			errorMas = 'No se pudieron cargar más.';
		} finally {
			cargando = false;
		}
	}

	const nombrePeriodo = $derived(data.periodos.find((p) => p.id === data.elegidos.periodo)?.nombre ?? '');
	const maxPorLlave = $derived(Math.max(1, ...data.porLlave.map((f) => f.peticiones)));
	const maxPorEndpoint = $derived(Math.max(1, ...data.porEndpoint.map((f) => f.peticiones)));
	const confianza = (c: number | null) => (c == null ? '' : `${Math.round(c * 100)} %`);
	const categoria = (c: string | null) => (c ? [...new Set(c.split(','))].join(', ') : '—');
</script>

<svelte:head><title>Uso · RAD View</title></svelte:head>

<div class="flex flex-col gap-6 py-2">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold">Uso</h1>
		<p class="max-w-3xl text-sm text-muted-foreground">
			Cada petición a un endpoint de documentos de RAD (<code class="codigo">/procesa_*</code>), con la
			llave que trajo, el resultado y cuánto tardó. Días y horas en hora del centro de México.
		</p>
	</div>

	<!-- Filtros: una sola fila arriba; afectan todo lo de abajo. Sin JS, el formulario hace lo mismo. -->
	<form method="GET" action="/uso" class="filtros" data-sveltekit-noscroll data-sveltekit-keepfocus>
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

		<div class="grid gap-6 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Por llave</Card.Title>
					<Card.Description>Quién llama. Clic en una fila para filtrar por ella.</Card.Description>
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
		<div class="grid items-start gap-6 lg:grid-cols-2">
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

		<Card.Root>
			<Card.Header>
				<Card.Title>Peticiones</Card.Title>
				<Card.Description>Las más recientes primero. Nada del contenido del documento: solo cómo fue la petición.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3">
				{#if filas.length === 0}
					<p class="vacio">Sin peticiones con estos filtros.</p>
				{:else}
					<Table.Root>
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
							<Button variant="outline" size="sm" onclick={cargarMas} disabled={cargando}>
								{cargando ? 'Cargando…' : 'Cargar más'}
							</Button>
						{/if}
						<span class="text-xs text-muted-foreground">
							{entero(filas.length)} de {entero(data.total)}
						</span>
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
</style>
