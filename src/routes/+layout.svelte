<script lang="ts">
  // Tailwind v4 + tokens de shadcn (app.css). Lo visual sigue a NexusDoc / Biblioratum y a
  // buzzword-agentes-ui: fondo casi blanco, barras blancas con borde fino y un acento azul.
  import '../app.css';
  import type { Snippet } from 'svelte';
  import favicon from '$lib/assets/favicon.svg';
  import { afterNavigate } from '$app/navigation';
  import TopNav from '$lib/TopNav.svelte';
  import Sidebar from '$lib/Sidebar.svelte';

  import type { LayoutData } from './$types';

  let { children, data }: { children: Snippet; data: LayoutData } = $props();
  let collapsed = $state(false);

  // En móvil el sidebar flota encima del contenido (ver @media abajo y en Sidebar.svelte):
  // arranca replegado y se vuelve a replegar en cada navegación para no tapar la página.
  // afterNavigate también corre al montar, así que cubre la carga inicial.
  afterNavigate(() => {
    if (window.matchMedia('(max-width: 680px)').matches) collapsed = true;
  });

  // View Transitions cuando el browser las soporta para animar el repliegue.
  function withTransition(fn: () => void) {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(fn);
    } else {
      fn();
    }
  }
  function toggleCollapsed() {
    withTransition(() => {
      collapsed = !collapsed;
    });
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if data.usuario}
  <TopNav usuario={data.usuario.usuario} />
  <Sidebar {collapsed} {toggleCollapsed} />
  <main class={collapsed ? 'collapsed' : ''}>
    <div class="contenido">
      {@render children()}
    </div>
  </main>
{:else}
  <!-- Sin sesión (solo /login): sin barras, la página trae su propia tarjeta. -->
  {@render children()}
{/if}

<style>
  :global(:root) {
    --topnav-height: 64px;
    --sidebar-width: 240px;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
  }
  :global(body) {
    min-height: 100vh;
    background: var(--background);
    color: var(--foreground);
  }

  :global(*) {
    scrollbar-width: auto;
    scrollbar-color: #cbd5e1 #f1f5f9;
  }
  :global(::-webkit-scrollbar) {
    width: 14px;
    height: 14px;
  }
  :global(::-webkit-scrollbar-track) {
    background: #f1f5f9;
    border-radius: 999px;
  }
  :global(::-webkit-scrollbar-thumb) {
    background: #cbd5e1;
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: padding-box;
  }
  :global(::-webkit-scrollbar-thumb:hover) {
    background: #94a3b8;
    background-clip: padding-box;
  }

  main {
    position: fixed;
    top: var(--topnav-height);
    right: 0;
    bottom: 0;
    left: var(--sidebar-width);
    overflow-y: auto;
    overflow-x: hidden;
    transition: left 0.22s ease-out;
  }
  main.collapsed {
    left: 0;
  }
  /* Móvil (mismo corte que la TopNav): el contenido usa todo el ancho y el sidebar flota
     encima (su z-index vive en Sidebar.svelte). */
  @media (max-width: 680px) {
    main {
      left: 0;
    }
  }

  .contenido {
    box-sizing: border-box;
    max-width: 90rem;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }
  @media (max-width: 680px) {
    .contenido {
      padding: 1.25rem 1rem;
    }
  }
</style>
