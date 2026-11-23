<script lang="ts">
	import * as Card from '$lib/components/ui/card';
</script>

<svelte:head><title>Uso · RAD View</title></svelte:head>

<div class="flex flex-col gap-6 py-2">
	<h1 class="text-2xl font-semibold">Uso</h1>
	<Card.Root>
		<Card.Header>
			<Card.Title>Pendiente</Card.Title>
			<Card.Description>
				Peticiones por cliente, endpoint, día y código de resultado. Hoy RAD no registra una línea
				por petición, así que primero hay que agregarle ese registro: ver CLAUDE.md.
			</Card.Description>
		</Card.Header>
	</Card.Root>
</div>
