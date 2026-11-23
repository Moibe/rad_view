<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Mi cuenta · RAD View</title></svelte:head>

<div class="flex flex-col gap-6 py-2">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold">Mi cuenta</h1>
		<p class="text-sm text-white/70">{data.usuario} · {data.esAdmin ? 'Admin' : 'Usuario'}</p>
	</div>

	<Card.Root class="max-w-sm">
		<Card.Header>
			<Card.Title>Cambiar mi contraseña</Card.Title>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/cambiarContrasena" class="flex flex-col gap-4" use:enhance>
				<div class="flex flex-col gap-1.5">
					<Label for="actual">Contraseña actual</Label>
					<Input id="actual" name="actual" type="password" autocomplete="current-password" required />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="nueva">Contraseña nueva (mínimo 8 caracteres)</Label>
					<Input
						id="nueva"
						name="nueva"
						type="password"
						autocomplete="new-password"
						minlength={8}
						required
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="confirmacion">Repite la contraseña nueva</Label>
					<Input
						id="confirmacion"
						name="confirmacion"
						type="password"
						autocomplete="new-password"
						required
					/>
				</div>

				{#if form?.error}<p class="text-sm text-red-300">{form.error}</p>{/if}
				{#if form?.cambiada}<p class="text-sm text-emerald-300">Listo, tu contraseña quedó cambiada.</p>{/if}

				<Button type="submit">Cambiar contraseña</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
