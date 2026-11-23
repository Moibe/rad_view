<script lang="ts">
  // Barra lateral blanca con borde fino (el mismo lenguaje que la TopNav y que la barra de
  // NexusDoc): la sección activa va en azul sólido, como las pestañas de buzzword-agentes-ui.
  // Incluye el botón para replegarla; replegada deja un asa al borde izquierdo para volver.
  import { page } from '$app/state';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import KeyRound from '@lucide/svelte/icons/key-round';
  import ChartColumn from '@lucide/svelte/icons/chart-column';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';

  const secciones = [
    { href: '/', label: 'Inicio', icon: LayoutDashboard },
    { href: '/keys', label: 'API keys', icon: KeyRound },
    { href: '/uso', label: 'Uso', icon: ChartColumn }
  ];
  const activa = (href: string) =>
    href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);

  let {
    collapsed = false,
    toggleCollapsed
  }: {
    collapsed?: boolean;
    toggleCollapsed: () => void;
  } = $props();
</script>

{#if !collapsed}
  <aside class="sidebar">
    <nav>
      {#each secciones as s (s.href)}
        <a href={s.href} class="nav-item" aria-current={activa(s.href) ? 'page' : undefined}>
          <s.icon size={18} aria-hidden="true" />
          <span>{s.label}</span>
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <button type="button" class="collapse-btn" onclick={toggleCollapsed} aria-label="Replegar barra">
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
    </div>
  </aside>
{:else}
  <button type="button" class="reveal-handle" onclick={toggleCollapsed} aria-label="Mostrar barra">
    <ChevronRight size={18} aria-hidden="true" />
  </button>
{/if}

<style>
  .sidebar {
    position: fixed;
    top: var(--topnav-height, 64px);
    left: 0;
    bottom: 0;
    box-sizing: border-box;
    width: var(--sidebar-width, 240px);
    padding: 1.25rem 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    background: var(--card);
    border-right: 1px solid var(--border);
    user-select: none;
  }
  /* Móvil: flota encima del contenido (el layout ya no le deja hueco), con sombra para que
     se despegue de la página. */
  @media (max-width: 680px) {
    .sidebar {
      z-index: 8;
      box-shadow: var(--shadow-md);
    }
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  nav::-webkit-scrollbar {
    display: none;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.65rem 0.85rem;
    color: var(--foreground);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 8px;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .nav-item :global(svg) {
    color: var(--muted-foreground);
    transition: color 0.15s ease;
  }
  .nav-item:hover {
    background: var(--muted);
  }
  .nav-item[aria-current='page'] {
    background: var(--primary);
    color: var(--primary-foreground);
  }
  .nav-item[aria-current='page'] :global(svg) {
    color: var(--primary-foreground);
  }
  .sidebar-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-top: auto;
    padding-top: 0.85rem;
    border-top: 1px solid var(--border);
  }
  .collapse-btn,
  .reveal-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.4rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    color: var(--muted-foreground);
    cursor: pointer;
    font: inherit;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .collapse-btn:hover,
  .reveal-handle:hover {
    background: var(--muted);
    color: var(--foreground);
  }
  .reveal-handle {
    position: fixed;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    padding: 0.6rem 0.35rem;
    border-left: none;
    border-radius: 0 10px 10px 0;
    box-shadow: var(--shadow-sm);
    z-index: 10;
  }
</style>
