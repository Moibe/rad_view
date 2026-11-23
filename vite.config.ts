import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// Local en 4900. En el server de CSI: dev en 4901 y prod en 4902 (los pone el .env de cada
	// checkout con PORT, que es lo que lee adapter-node). strictPort: si está ocupado, falla en vez
	// de brincar a otro puerto en silencio.
	server: { port: 4900, strictPort: true },
	preview: { port: 4900, strictPort: true },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter()
		})
	]
});
