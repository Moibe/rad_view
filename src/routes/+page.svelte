<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Inicio · RAD View</title></svelte:head>

<div class="flex flex-col gap-6 py-2">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold">Hola, {data.usuario?.usuario}</h1>
		<p class="text-sm text-muted-foreground">
			Administración de RAD, la API de reconocimiento de documentos (INE, pasaporte, cédula
			panameña…).
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<a href="/keys" class="block">
			<Card.Root class="h-full transition-shadow hover:shadow-md hover:ring-primary/40">
				<Card.Header>
					<Card.Title>API keys</Card.Title>
					<Card.Description>Generar, ver y revocar las llaves de los clientes de RAD.</Card.Description>
				</Card.Header>
			</Card.Root>
		</a>
		<a href="/uso" class="block">
			<Card.Root class="h-full transition-shadow hover:shadow-md hover:ring-primary/40">
				<Card.Header>
					<Card.Title>Uso</Card.Title>
					<Card.Description>Peticiones por cliente, endpoint, día y resultado.</Card.Description>
				</Card.Header>
			</Card.Root>
		</a>
	</div>
</div>
