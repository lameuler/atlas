import sitemap from '@astrojs/sitemap'
import svelte from '@astrojs/svelte'
import virtual from '@rollup/plugin-virtual'
import type { AstroIntegration } from 'astro'

import pagefind from './pagefind.js'
import type { Page } from './sidebar.js'

export interface AtlasOptions {
    name: string
    github?: string
    sidebar?: {
        name?: string
        pages: Page[]
        prevGroupNav?: boolean
        nextGroupNav?: boolean
    }[]
}

export default function atlas(options: AtlasOptions): AstroIntegration {
    return {
        name: '@lameuler/atlas',
        hooks: {
            'astro:config:setup': ({ injectRoute, updateConfig }) => {
                injectRoute({
                    pattern: '[...slug]',
                    entrypoint: '@lameuler/atlas/pages/entry.astro',
                })
                injectRoute({
                    pattern: '404',
                    entrypoint: '@lameuler/atlas/pages/404.astro',
                })
                updateConfig({
                    integrations: [svelte(), pagefind(), sitemap()],
                    markdown: {
                        shikiConfig: {
                            themes: {
                                light: 'github-light',
                                dark: 'github-dark',
                            },
                            defaultColor: false,
                        },
                    },
                    vite: {
                        plugins: [
                            virtual({
                                '@lameuler/atlas:virtual': `export const options = ${JSON.stringify(options)}`,
                            }),
                        ],
                    },
                })
            },
        },
    }
}
