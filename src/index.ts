import sitemap from '@astrojs/sitemap'
import svelte from '@astrojs/svelte'
import virtual from '@rollup/plugin-virtual'
import type { AstroIntegration } from 'astro'

import pagefind from './pagefind.js'
import { rehypeAside, rehypeLinks } from './plugins.js'
import previews from './previews.js'
import type { Page } from './sidebar.js'

export interface AtlasOptions {
    name: string
    github?: string
    badge?: string
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
                // TODO this is temporary
                injectRoute({
                    pattern: 'model/[...id]',
                    entrypoint: '@lameuler/atlas/pages/model.astro',
                })
                const config = updateConfig({
                    build: {
                        assets: 'assets',
                    },
                    integrations: [svelte(), pagefind(), sitemap(), previews(options)],
                    markdown: {
                        shikiConfig: {
                            themes: {
                                light: 'github-light',
                                dark: 'github-dark',
                            },
                            defaultColor: false,
                        },
                    },
                })
                const finalConfig = updateConfig({
                    vite: {
                        plugins: [
                            virtual({
                                '@lameuler/atlas:virtual': `export const options = ${JSON.stringify(options)}; export const buildConfig = ${JSON.stringify(config.build)}`,
                            }),
                        ],
                    },
                    markdown: {
                        rehypePlugins: [rehypeAside, [rehypeLinks, config]],
                    },
                })
                globalThis.atlasAstroMarkdownOptions = finalConfig.markdown
                // TODO load source docs here
            },
            'astro:server:setup': ({ server }) => {
                // TODO watch files and reload source docs
                // server.watcher.add(resolve('../temp/astro-pdf/src/'))
                server.watcher.on('change', (path) => console.log(path, 'changed'))
            },
        },
    }
}
