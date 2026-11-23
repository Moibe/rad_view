<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';

	let { mensaje }: { mensaje: string } = $props();
</script>

<!-- Falla al hablar con RAD: se dice qué pasó y dónde se arregla, sin tumbar la página. -->
<div class="aviso" role="alert">
	<CircleAlert class="mt-0.5 size-4 shrink-0 text-destructive" />
	<div class="flex flex-col gap-1">
		<p class="font-medium text-foreground">No se pudo leer RAD</p>
		<p class="text-muted-foreground">{mensaje}</p>
		<p class="text-xs text-muted-foreground">
			El panel llega a RAD con <code>RAD_URL</code> y <code>RAD_ADMIN_TOKEN</code> de su
			<code>.env</code>; el token debe ser el mismo que en el <code>.env</code> de RAD.
		</p>
	</div>
</div>

<style>
	.aviso {
		display: flex;
		gap: 0.75rem;
		padding: 0.9rem 1rem;
		border: 1px solid color-mix(in srgb, var(--destructive) 35%, var(--border));
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--destructive) 5%, var(--card));
		font-size: 0.875rem;
	}
	code {
		font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
		font-size: 0.85em;
	}
</style>
