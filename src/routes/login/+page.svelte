<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let entrando = $state(false);
</script>

<svelte:head><title>Entrar · RAD View</title></svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
	<form
		method="POST"
		class="glass flex w-full max-w-sm flex-col gap-5 p-8"
		use:enhance={() => {
			entrando = true;
			return async ({ update }) => {
				await update({ reset: false });
				entrando = false;
			};
		}}
	>
		<div class="flex flex-col gap-1 text-center">
			<h1 class="text-2xl font-semibold">RAD View</h1>
			<p class="text-sm text-white/70">Administración de la API de RAD</p>
		</div>

		<div class="flex flex-col gap-1.5">
			<Label for="usuario">Usuario</Label>
			<!-- svelte-ignore a11y_autofocus -->
			<Input
				id="usuario"
				name="usuario"
				autocomplete="username"
				autofocus
				required
				value={form?.usuario ?? ''}
			/>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="contrasena">Contraseña</Label>
			<Input
				id="contrasena"
				name="contrasena"
				type="password"
				autocomplete="current-password"
				required
			/>
		</div>

		{#if form?.error}
			<p class="text-sm text-red-300">{form.error}</p>
		{/if}

		<Button type="submit" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</Button>
	</form>
</div>

<style>
	.glass {
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(8px) saturate(110%);
		-webkit-backdrop-filter: blur(8px) saturate(110%);
		border: 1px solid #fff;
		border-radius: 16px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 4px 16px rgba(0, 0, 0, 0.12);
	}
</style>
