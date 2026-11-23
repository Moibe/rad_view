<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import AvisoRad from '$lib/AvisoRad.svelte';
	import { entero, fecha, fechaHora, type Llave, type LlaveNueva } from '$lib/rad';
	import Check from '@lucide/svelte/icons/check';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import Copy from '@lucide/svelte/icons/copy';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Plus from '@lucide/svelte/icons/plus';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// La llave recién creada llega solo en la respuesta de la action y se queda en el estado de esta
	// página (no en `form`, que la siguiente action —revocar otra— reemplazaría). Al salir de la
	// página o recargar, desaparece; «Ya la guardé» la oculta antes. Sin JS, viene de `form`.
	let llaveNueva = $state<LlaveNueva | null>(null);
	let guardada = $state<number | null>(null);
	const nueva = $derived.by(() => {
		const n = llaveNueva ?? (form && 'nueva' in form ? form.nueva : null);
		return n && n.id !== guardada ? n : null;
	});

	let copiado = $state(false);
	let campoLlave = $state<HTMLInputElement | null>(null);

	// navigator.clipboard solo existe en contexto seguro (https o localhost); el server de CSI se
	// abre por http://IP, así que ahí se copia seleccionando el campo con execCommand.
	async function copiar(texto: string) {
		let ok = false;
		try {
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(texto);
				ok = true;
			}
		} catch {
			/* cae al plan B */
		}
		if (!ok && campoLlave) {
			campoLlave.focus();
			campoLlave.select();
			ok = document.execCommand('copy');
		}
		if (ok) {
			copiado = true;
			setTimeout(() => (copiado = false), 2000);
		}
	}

	let enviando = $state(false);

	// Revocar: confirmación con el diálogo del sitio (nunca confirm() del navegador).
	let porRevocar = $state<Llave | null>(null);
	let dialogoAbierto = $state(false);
	let revocando = $state(false);
	function pedirRevocar(l: Llave) {
		porRevocar = l;
		dialogoAbierto = true;
	}

	const activas = $derived(data.llaves.filter((l) => !l.revocada).length);
</script>

<svelte:head><title>API keys · RAD View</title></svelte:head>

<div class="flex flex-col gap-6 py-2">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold">API keys</h1>
		<p class="max-w-3xl text-sm text-muted-foreground">
			Las llaves con que los clientes llaman a RAD, en la cabecera <code class="codigo">X-API-Key</code>.
			Hoy RAD está en <strong class="font-medium text-foreground">modo observación</strong>: la llave
			es opcional y nadie se rechaza por ella, pero cada petición queda registrada con la llave que
			trajo (o sin ella) en <a href="/uso" class="text-primary hover:underline">Uso</a>.
		</p>
	</div>

	{#if data.error}
		<AvisoRad mensaje={data.error} />
	{/if}

	{#if nueva}
		<Card.Root class="llave-nueva">
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<KeyRound class="size-4 text-primary" />
					Llave de {nueva.cliente}
				</Card.Title>
				<Card.Description class="flex items-start gap-2 text-foreground">
					<TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-600" />
					<span>
						Cópiala y entrégala ahora: es la única vez que se muestra. RAD solo guarda su huella, así
						que no se puede recuperar. Si se pierde, revócala y genera otra.
					</span>
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3">
				<div class="flex flex-col gap-2 sm:flex-row">
					<input
						bind:this={campoLlave}
						class="campo-llave"
						readonly
						value={nueva.llave}
						aria-label="Llave completa"
						onfocus={(e) => e.currentTarget.select()}
					/>
					<Button onclick={() => copiar(nueva.llave)} class="shrink-0">
						{#if copiado}<Check />Copiada{:else}<Copy />Copiar{/if}
					</Button>
				</div>
				<p class="text-xs text-muted-foreground">
					El cliente la manda así en cada petición:
					<code class="codigo">X-API-Key: {nueva.prefijo}…</code>
				</p>
			</Card.Content>
			<Card.Footer class="justify-end">
				<Button variant="outline" onclick={() => (guardada = nueva.id)}>Ya la guardé</Button>
			</Card.Footer>
		</Card.Root>
	{/if}

	{#if data.esAdmin}
		<Card.Root class="max-w-xl">
			<Card.Header>
				<Card.Title>Generar una llave</Card.Title>
				<Card.Description>Una por cliente (o por sistema del cliente), para ver su uso por separado.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/crear"
					class="flex flex-col gap-4"
					use:enhance={() => {
						enviando = true;
						return async ({ result, update }) => {
							if (result.type === 'success' && result.data?.nueva) {
								llaveNueva = result.data.nueva as LlaveNueva;
								copiado = false;
							}
							await update();
							enviando = false;
						};
					}}
				>
					<div class="flex flex-col gap-1.5">
						<Label for="cliente">Cliente</Label>
						<Input
							id="cliente"
							name="cliente"
							maxlength={120}
							required
							placeholder="Ej. Portal de onboarding"
							value={form && 'cliente' in form ? (form.cliente ?? '') : ''}
						/>
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="nota">Nota <span class="font-normal text-muted-foreground">(opcional)</span></Label>
						<Input
							id="nota"
							name="nota"
							maxlength={500}
							placeholder="Para qué es, quién la pidió…"
							value={form && 'nota' in form ? (form.nota ?? '') : ''}
						/>
					</div>
					{#if form && 'error' in form && form.error}
						<p class="text-sm text-destructive">{form.error}</p>
					{/if}
					<Button type="submit" class="self-start" disabled={enviando}>
						<Plus />{enviando ? 'Generando…' : 'Generar llave'}
					</Button>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Llaves</Card.Title>
			<Card.Description>
				{entero(activas)} activa{activas === 1 ? '' : 's'} de {entero(data.llaves.length)}. Revocar no
				borra la llave: su uso pasado sigue a su nombre.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if form && 'errorRevocar' in form && form.errorRevocar}
				<p class="mb-3 text-sm text-destructive">{form.errorRevocar}</p>
			{/if}
			{#if data.llaves.length === 0}
				<p class="py-6 text-center text-sm text-muted-foreground">
					{data.error ? 'No se pudieron leer las llaves.' : 'Todavía no hay llaves.'}
				</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Cliente</Table.Head>
							<Table.Head>Llave</Table.Head>
							<Table.Head>Creada</Table.Head>
							<Table.Head class="text-right">Peticiones</Table.Head>
							<Table.Head>Último uso</Table.Head>
							<Table.Head>Estado</Table.Head>
							<Table.Head><span class="sr-only">Acciones</span></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.llaves as l (l.id)}
							<Table.Row class={l.revocada ? 'text-muted-foreground' : ''}>
								<Table.Cell class="max-w-72 whitespace-normal">
									<div class="font-medium {l.revocada ? '' : 'text-foreground'}">{l.cliente}</div>
									{#if l.nota}<div class="text-xs text-muted-foreground">{l.nota}</div>{/if}
								</Table.Cell>
								<Table.Cell><code class="codigo">{l.prefijo}…</code></Table.Cell>
								<Table.Cell title={fechaHora(l.creada)}>{fecha(l.creada)}</Table.Cell>
								<Table.Cell class="text-right tabular-nums">{entero(l.peticiones)}</Table.Cell>
								<Table.Cell>{l.ultimo_uso ? fechaHora(l.ultimo_uso) : 'Nunca'}</Table.Cell>
								<Table.Cell>
									{#if l.revocada}
										<Badge variant="outline" title="Revocada el {fechaHora(l.revocada)}">Revocada</Badge>
									{:else}
										<Badge variant="secondary" class="bg-emerald-50 text-emerald-700">Activa</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-1">
										<Button variant="ghost" size="sm" href="/uso?llave={l.id}&periodo=30d">
											<ChartColumn />Uso
										</Button>
										{#if data.esAdmin && !l.revocada}
											<Button
												variant="ghost"
												size="sm"
												class="text-destructive hover:bg-destructive/10 hover:text-destructive"
												onclick={() => pedirRevocar(l)}
											>
												Revocar
											</Button>
										{/if}
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<AlertDialog.Root bind:open={dialogoAbierto}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>¿Revocar la llave de {porRevocar?.cliente}?</AlertDialog.Title>
			<AlertDialog.Description>
				<code class="codigo">{porRevocar?.prefijo}…</code> dejará de valer y no se puede deshacer. Mientras
				RAD esté en modo observación sus peticiones se siguen atendiendo y quedan marcadas como
				«llave revocada»; cuando RAD exija llave, se rechazarán.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form
			method="POST"
			action="?/revocar"
			use:enhance={() => {
				revocando = true;
				return async ({ result, update }) => {
					// Si revocó justo la que se acaba de crear, ya no tiene caso mostrarla para copiar.
					if (result.type === 'success' && porRevocar?.id === nueva?.id) guardada = porRevocar!.id;
					await update({ reset: false });
					revocando = false;
					dialogoAbierto = false;
				};
			}}
		>
			<input type="hidden" name="id" value={porRevocar?.id ?? ''} />
			<AlertDialog.Footer>
				<AlertDialog.Cancel type="button">Cancelar</AlertDialog.Cancel>
				<Button type="submit" class="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={revocando}>
					{revocando ? 'Revocando…' : 'Revocar llave'}
				</Button>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>

<style>
	:global(.llave-nueva) {
		box-shadow:
			0 0 0 1px var(--primary),
			var(--shadow-md);
		background: var(--primary-bg) !important;
	}
	.campo-llave {
		flex: 1;
		min-width: 0;
		height: 2.25rem;
		padding: 0 0.75rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--card);
		font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
		font-size: 0.85rem;
		color: var(--foreground);
	}
	.campo-llave:focus {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
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
</style>
