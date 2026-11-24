<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import ScanText from '@lucide/svelte/icons/scan-text';
	import EtiquetaAmbiente from '$lib/EtiquetaAmbiente.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let entrando = $state(false);
</script>

<svelte:head><title>Entrar · RAD View</title></svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
	<form
		method="POST"
		class="tarjeta flex w-full max-w-sm flex-col gap-5 p-8"
		use:enhance={() => {
			entrando = true;
			return async ({ update }) => {
				await update({ reset: false });
				entrando = false;
			};
		}}
	>
		<div class="flex flex-col items-center gap-3 text-center">
			<span class="logo" aria-hidden="true"><ScanText size={24} strokeWidth={2} /></span>
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-semibold">RAD View</h1>
				<p class="text-sm text-muted-foreground">Administración de la API de RAD</p>
			</div>
			<EtiquetaAmbiente ambiente={data.ambiente} />
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
			<p class="text-sm text-destructive">{form.error}</p>
		{/if}

		<Button type="submit" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</Button>
	</form>
</div>

<style>
	.tarjeta {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 16px;
		box-shadow: var(--shadow-md);
	}
	.logo {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--primary);
		color: var(--primary-foreground);
	}
</style>
