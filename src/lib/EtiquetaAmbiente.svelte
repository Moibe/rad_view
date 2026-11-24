<script lang="ts">
	// Etiqueta del ambiente (producción / desarrollo / local), para no confundir el panel de
	// prod con el de dev: las llaves de uno no sirven en el RAD del otro.
	import type { Ambiente } from '$lib/tipos';

	let { ambiente }: { ambiente: Ambiente } = $props();

	const NOMBRE: Record<Ambiente, { largo: string; corto: string; titulo: string }> = {
		prod: { largo: 'Producción', corto: 'PROD', titulo: 'Producción: administra el RAD de producción' },
		dev: { largo: 'Desarrollo', corto: 'DEV', titulo: 'Desarrollo: administra el RAD de dev' },
		local: { largo: 'Local', corto: 'LOCAL', titulo: 'Local: corre en este equipo' }
	};
</script>

<span class="ambiente {ambiente}" title={NOMBRE[ambiente].titulo}>
	<span class="punto" aria-hidden="true"></span>
	<span class="largo">{NOMBRE[ambiente].largo}</span>
	<span class="corto" aria-hidden="true">{NOMBRE[ambiente].corto}</span>
</span>

<style>
	.ambiente {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		white-space: nowrap;
		color: var(--ambiente-texto);
		background: var(--ambiente-fondo);
	}
	.punto {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 999px;
		background: currentColor;
	}
	.prod {
		--ambiente-fondo: var(--ambiente-prod);
		--ambiente-texto: var(--ambiente-prod-texto);
	}
	.dev {
		--ambiente-fondo: var(--ambiente-dev);
		--ambiente-texto: var(--ambiente-dev-texto);
	}
	.local {
		--ambiente-fondo: var(--ambiente-local);
		--ambiente-texto: var(--ambiente-local-texto);
	}
	.corto {
		display: none;
	}
	@media (max-width: 680px) {
		.largo {
			display: none;
		}
		.corto {
			display: inline;
		}
	}
</style>
