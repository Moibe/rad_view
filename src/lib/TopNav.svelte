<script lang="ts">
  // Barra superior blanca, como la de NexusDoc / buzzword-agentes-ui: marca a la izquierda,
  // la cuenta a la derecha. Las secciones viven en el Sidebar. En móvil colapsa a solo-íconos.
  import { page } from '$app/state';
  import ScanText from '@lucide/svelte/icons/scan-text';
  import CircleUserRound from '@lucide/svelte/icons/circle-user-round';
  import LogOut from '@lucide/svelte/icons/log-out';

  let { usuario }: { usuario: string } = $props();

  const items = [{ href: '/mi-cuenta', label: 'Mi cuenta', icon: CircleUserRound }];
</script>

<header class="topnav">
  <a href="/" class="brand" aria-label="Inicio">
    <span class="brand-ico" aria-hidden="true"><ScanText size={20} strokeWidth={2} /></span>
    <span class="brand-info">
      <span class="brand-title">RAD View</span>
      <span class="brand-sub">Administración de RAD</span>
    </span>
  </a>

  <nav class="topnav-nav">
    {#each items as it (it.href)}
      <a href={it.href} class="nav-item" aria-current={page.url.pathname === it.href ? 'page' : undefined}>
        <it.icon size={16} aria-hidden="true" />
        <span class="nav-label">{it.label}</span>
      </a>
    {/each}
  </nav>

  <div class="cuenta">
    <span class="cuenta-nombre">{usuario}</span>
    <span class="separador" aria-hidden="true"></span>
    <form method="POST" action="/logout">
      <button type="submit" class="salir" aria-label="Salir">
        <LogOut size={16} aria-hidden="true" />
        <span class="nav-label">Salir</span>
      </button>
    </form>
  </div>
</header>

<style>
  .topnav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--topnav-height, 64px);
    padding: 0 1.5rem;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    background: var(--card);
    border-bottom: 1px solid var(--border);
    user-select: none;
    z-index: 9;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--foreground);
    text-decoration: none;
    border-radius: 10px;
    min-width: 0;
  }
  .brand-ico {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary);
    color: var(--primary-foreground);
  }
  .brand-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .brand-title {
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: -0.005em;
    white-space: nowrap;
  }
  .brand-sub {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--muted-foreground);
    white-space: nowrap;
  }

  .topnav-nav {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: 1.5rem;
    padding-left: 1.5rem;
    border-left: 1px solid var(--border);
    height: 32px;
  }

  .nav-item,
  .salir {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.8rem;
    color: var(--foreground);
    text-decoration: none;
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 500;
    border-radius: 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .nav-item:hover,
  .salir:hover {
    background: var(--muted);
  }
  .nav-item[aria-current='page'] {
    background: var(--primary);
    color: var(--primary-foreground);
  }

  .cuenta {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .cuenta-nombre {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--foreground);
  }
  .separador {
    width: 1px;
    height: 24px;
    background: var(--border);
  }
  .salir {
    border: 1px solid var(--border);
    background: var(--card);
    padding: 0.45rem 0.75rem;
  }

  /* En pantallas chicas: solo íconos (oculta textos) para que no se desborde. */
  @media (max-width: 680px) {
    .topnav {
      padding: 0 0.75rem;
    }
    .brand-info {
      display: none;
    }
    .topnav-nav {
      margin-left: 0.75rem;
      padding-left: 0.75rem;
    }
    .nav-item,
    .salir {
      padding: 0.5rem;
    }
    .nav-label,
    .cuenta-nombre,
    .separador {
      display: none;
    }
  }
</style>
