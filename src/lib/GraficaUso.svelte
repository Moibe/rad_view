<script lang="ts">
	// Peticiones por hora (hoy) o por día, apiladas por resultado. SVG a mano, sin librería:
	// columnas de 24 px como máximo, punta redondeada de 4 px y base recta, 2 px de aire entre
	// segmentos, rejilla de 1 px. Cada columna es su propia zona de hover/foco con tooltip, y la
	// tabla de abajo trae los mismos números sin hover.
	import { DESCRIPCION_RESULTADO, NOMBRE_RESULTADO, RESULTADOS, entero, type Cubeta, type Resultado } from '$lib/rad';

	let { cubetas, agrupar }: { cubetas: Cubeta[]; agrupar: 'hora' | 'dia' } = $props();

	const COLOR: Record<Resultado, string> = {
		procesado: 'var(--uso-procesado)',
		no_procesado: 'var(--uso-no-procesado)',
		error: 'var(--uso-error)'
	};
	const ALTO = 240;
	const M = { arriba: 12, derecha: 4, abajo: 26, izquierda: 44 };
	const HUECO = 2;

	let ancho = $state(0);
	let activo = $state<number | null>(null);

	const total = (c: Cubeta) => c.procesado + c.no_procesado + c.error;
	const maximo = $derived(Math.max(0, ...cubetas.map(total)));

	/** Marcas del eje Y en números redondos (1, 2 o 5 × 10ⁿ), de 0 a un poco más del máximo. */
	const ticks = $derived.by(() => {
		if (maximo === 0) return [0, 1];
		const crudo = maximo / 4;
		const pot = 10 ** Math.floor(Math.log10(crudo));
		const paso = Math.max(1, [1, 2, 5, 10].map((k) => k * pot).find((p) => p >= crudo)!);
		return Array.from({ length: Math.ceil(maximo / paso) + 1 }, (_, i) => i * paso);
	});
	const tope = $derived(ticks[ticks.length - 1]);
	const altoPlot = ALTO - M.arriba - M.abajo;
	const anchoPlot = $derived(Math.max(0, ancho - M.izquierda - M.derecha));
	const ranura = $derived(cubetas.length ? anchoPlot / cubetas.length : 0);
	const grosor = $derived(Math.max(1, Math.min(24, ranura * 0.7)));
	const y = (v: number) => M.arriba + altoPlot - (v / tope) * altoPlot;
	const xCentro = (i: number) => M.izquierda + ranura * (i + 0.5);

	/** Segmentos de una columna, de la base hacia arriba; el de hasta arriba lleva la punta redonda. */
	function segmentos(c: Cubeta) {
		let acumulado = 0;
		const visibles = RESULTADOS.filter((r) => c[r] > 0);
		return visibles.map((r, k) => {
			const abajo = y(acumulado);
			acumulado += c[r];
			const arriba = y(acumulado);
			const alto = Math.max(1, abajo - arriba - (k > 0 ? HUECO : 0));
			return { r, arriba, alto, punta: k === visibles.length - 1 };
		});
	}

	function ruta(x: number, yTop: number, w: number, h: number, punta: boolean) {
		const r = punta ? Math.min(4, w / 2, h) : 0;
		const b = yTop + h;
		if (!r) return `M${x},${b}V${yTop}H${x + w}V${b}Z`;
		return `M${x},${b}V${yTop + r}A${r},${r} 0 0 1 ${x + r},${yTop}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${yTop + r}V${b}Z`;
	}

	// Claves de RAD: 'AAAA-MM-DD' (día) o 'AAAA-MM-DDTHH' (hora), ya en hora de México.
	const fmtDia = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'short' });
	const fmtDiaLargo = new Intl.DateTimeFormat('es-MX', {
		timeZone: 'UTC',
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});
	const comoFecha = (clave: string) => new Date(clave.slice(0, 10) + 'T00:00:00Z');
	const etiqueta = (clave: string) =>
		agrupar === 'hora' ? `${Number(clave.slice(11, 13))} h` : fmtDia.format(comoFecha(clave));
	const etiquetaLarga = (clave: string) => {
		if (agrupar === 'dia') {
			const t = fmtDiaLargo.format(comoFecha(clave));
			return t.charAt(0).toUpperCase() + t.slice(1);
		}
		const h = Number(clave.slice(11, 13));
		return `De ${h}:00 a ${h + 1}:00`;
	};

	/** Cada cuántas columnas va una etiqueta del eje X; la más reciente siempre lleva. */
	const cada = $derived(Math.max(1, Math.ceil(cubetas.length / Math.max(1, Math.floor(anchoPlot / 58)))));
	const conEtiqueta = (i: number) => (cubetas.length - 1 - i) % cada === 0;

	function teclas(e: KeyboardEvent) {
		if (!cubetas.length) return;
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			e.preventDefault();
			const actual = activo ?? cubetas.length - 1;
			activo = Math.min(cubetas.length - 1, Math.max(0, actual + (e.key === 'ArrowRight' ? 1 : -1)));
		} else if (e.key === 'Escape') activo = null;
	}

	// El tooltip va al lado de la columna, nunca encima de ella.
	const tooltip = $derived.by(() => {
		if (activo === null || !cubetas[activo]) return null;
		const c = cubetas[activo];
		const x = xCentro(activo);
		const aLaDerecha = x < ancho / 2;
		return { c, x: aLaDerecha ? x + grosor / 2 + 10 : x - grosor / 2 - 10, aLaDerecha };
	});
</script>

<div class="flex flex-col gap-3">
	<ul class="leyenda" aria-label="Leyenda">
		{#each RESULTADOS as r (r)}
			<li title={DESCRIPCION_RESULTADO[r]}>
				<span class="muestra" style:background={COLOR[r]}></span>{NOMBRE_RESULTADO[r]}
			</li>
		{/each}
	</ul>

	<div class="lienzo" bind:clientWidth={ancho} style:height="{ALTO}px">
		{#if ancho > 0}
			<!-- Enfocable y con flechas para recorrer columnas: el tooltip también sirve con teclado. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<svg
				width={ancho}
				height={ALTO}
				tabindex="0"
				role="group"
				aria-label="Peticiones por {agrupar === 'hora' ? 'hora' : 'día'}, por resultado. Flechas izquierda y derecha para recorrer las columnas."
				onkeydown={teclas}
				onfocus={() => (activo ??= cubetas.length - 1)}
				onblur={() => (activo = null)}
				onpointerleave={() => (activo = null)}
			>
				{#each ticks as t (t)}
					<line
						x1={M.izquierda}
						x2={ancho - M.derecha}
						y1={y(t)}
						y2={y(t)}
						class={t === 0 ? 'base' : 'rejilla'}
					/>
					<text x={M.izquierda - 8} y={y(t)} class="eje" text-anchor="end" dominant-baseline="middle">
						{entero(t)}
					</text>
				{/each}

				{#each cubetas as c, i (c.clave)}
					<g class="columna" class:atenuada={activo !== null && activo !== i}>
						{#each segmentos(c) as s (s.r)}
							<path d={ruta(xCentro(i) - grosor / 2, s.arriba, grosor, s.alto, s.punta)} fill={COLOR[s.r]} />
						{/each}
					</g>
					{#if conEtiqueta(i)}
						<text x={xCentro(i)} y={ALTO - 8} class="eje" text-anchor="middle">{etiqueta(c.clave)}</text>
					{/if}
					<!-- zona de hover: toda la ranura y toda la altura, no solo lo pintado -->
					<rect
						x={M.izquierda + ranura * i}
						y={M.arriba}
						width={ranura}
						height={altoPlot}
						fill="transparent"
						role="presentation"
						onpointerenter={() => (activo = i)}
					/>
				{/each}

				{#if maximo === 0}
					<text x={M.izquierda + anchoPlot / 2} y={M.arriba + altoPlot / 2} class="vacio" text-anchor="middle">
						Sin peticiones en este periodo
					</text>
				{/if}
			</svg>

			{#if tooltip}
				<div
					class="tooltip"
					style:left="{tooltip.x}px"
					style:transform={tooltip.aLaDerecha ? 'none' : 'translateX(-100%)'}
					role="status"
				>
					<p class="titulo">{etiquetaLarga(tooltip.c.clave)}</p>
					<p class="fila total"><strong>{entero(total(tooltip.c))}</strong> peticiones</p>
					{#each [...RESULTADOS].reverse() as r (r)}
						<p class="fila">
							<span class="clave" style:background={COLOR[r]}></span>
							<strong>{entero(tooltip.c[r])}</strong>
							<span>{NOMBRE_RESULTADO[r].toLowerCase()}</span>
						</p>
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	<details class="tabla">
		<summary>Ver como tabla</summary>
		<div class="max-h-72 overflow-auto">
			<table>
				<thead>
					<tr>
						<th>{agrupar === 'hora' ? 'Hora' : 'Día'}</th>
						{#each RESULTADOS as r (r)}<th>{NOMBRE_RESULTADO[r]}</th>{/each}
						<th>Total</th>
					</tr>
				</thead>
				<tbody>
					{#each [...cubetas].reverse() as c (c.clave)}
						<tr>
							<td>{agrupar === 'hora' ? etiquetaLarga(c.clave) : etiqueta(c.clave)}</td>
							{#each RESULTADOS as r (r)}<td>{entero(c[r])}</td>{/each}
							<td><strong>{entero(total(c))}</strong></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>
</div>

<style>
	.leyenda {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1.1rem;
		font-size: 0.8rem;
		color: var(--muted-foreground);
	}
	.leyenda li {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.muestra {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 3px;
	}
	.lienzo {
		position: relative;
		width: 100%;
	}
	svg {
		display: block;
		outline: none;
		border-radius: 0.5rem;
	}
	svg:focus-visible {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 60%, transparent);
	}
	.rejilla {
		stroke: var(--grafica-rejilla);
		stroke-width: 1;
		shape-rendering: crispEdges;
	}
	.base {
		stroke: var(--grafica-base);
		stroke-width: 1;
		shape-rendering: crispEdges;
	}
	.eje {
		fill: var(--muted-foreground);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	.vacio {
		fill: var(--muted-foreground);
		font-size: 13px;
	}
	.columna {
		transition: opacity 120ms;
	}
	.columna.atenuada {
		opacity: 0.4;
	}
	.tooltip {
		position: absolute;
		top: 4px;
		z-index: 2;
		min-width: 10rem;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		background: var(--popover);
		box-shadow: var(--shadow-md);
		font-size: 0.78rem;
		color: var(--muted-foreground);
		pointer-events: none;
		white-space: nowrap;
	}
	.tooltip .titulo {
		margin-bottom: 0.3rem;
		color: var(--foreground);
		font-weight: 500;
	}
	.tooltip .fila {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		line-height: 1.6;
	}
	.tooltip .total {
		margin-bottom: 0.15rem;
	}
	.tooltip strong {
		color: var(--foreground);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.tooltip .clave {
		width: 0.75rem;
		height: 2px;
		border-radius: 1px;
	}
	.tabla summary {
		cursor: pointer;
		width: fit-content;
		font-size: 0.8rem;
		color: var(--muted-foreground);
	}
	.tabla summary:hover {
		color: var(--foreground);
	}
	.tabla table {
		width: 100%;
		margin-top: 0.5rem;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
	}
	.tabla th,
	.tabla td {
		padding: 0.3rem 0.5rem;
		text-align: right;
		border-bottom: 1px solid var(--border);
	}
	.tabla th:first-child,
	.tabla td:first-child {
		text-align: left;
	}
	.tabla th {
		position: sticky;
		top: 0;
		background: var(--card);
		color: var(--muted-foreground);
		font-weight: 500;
	}
</style>
