<script lang="ts">
	import * as Card from '$lib/components/ui/card';
</script>

<svelte:head><title>API keys · RAD View</title></svelte:head>

<div class="flex flex-col gap-6 py-2">
	<h1 class="text-2xl font-semibold">API keys</h1>
	<Card.Root>
		<Card.Header>
			<Card.Title>Pendiente</Card.Title>
			<Card.Description>
				Aquí se generan, listan y revocan las llaves de los clientes de RAD. Antes de construirla
				hay que decidir dónde viven las llaves y cómo las valida RAD: ver CLAUDE.md.
			</Card.Description>
		</Card.Header>
	</Card.Root>
</div>
