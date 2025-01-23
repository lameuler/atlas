import sitemap from '@astrojs/sitemap'
import svelte from '@astrojs/svelte'
import virtual from '@rollup/plugin-virtual'
import type { AstroConfig, AstroIntegration } from 'astro'
import { ReflectionSymbolId } from 'typedoc'

import { getExports } from './model/model.js'
import pagefind from './pagefind.js'
import { rehypeAside, rehypeLinks } from './plugins.js'
import previews from './previews.js'
import type { Group, Page } from './sidebar.js'
import { getEntryPathname } from './util.js'

export interface AtlasOptions {
    name: string
    github?: string
    badge?: string
    sidebar?: Group[]
    reference?: {
        sidebarName?: string
        base?: string
        entries: { file: string; id?: string }[]
        tsconfig?: string
        resolveLink?: (id: ReflectionSymbolId) => string | undefined
    }
}

export default function atlas(options: AtlasOptions): AstroIntegration {
    const base = (options.reference?.base ?? 'reference').replace(/^\/+/, '').replace(/\/+$/, '')
    let referenceFiles: string[] = []
    let config: AstroConfig

    async function loadReferenceData() {
        if (!options.reference) return

        const { entries, files } = await getExports(
            options.reference.entries,
            options.reference.tsconfig,
            config.build.format,
            config.base + '/' + base,
            options.reference.resolveLink,
        )
        globalThis.atlasReference = {
            pages: [],
        }
        referenceFiles = files

        for (const named of entries.map((entry) => [entry, ...entry.exports]).flat()) {
            const id = named.heading.slug
            if (typeof id === 'string') {
                globalThis.atlasReference.pages.push({
                    id,
                    named,
                    href: getEntryPathname(id, config.base + '/' + base, config.build.format),
                })
            }
        }
        const group: Group = {
            name: options.reference.sidebarName ?? 'Reference',
            pages: globalThis.atlasReference.pages.map<Page>(({ named, href }) => ({
                label: named.name,
                page: href,
            })),
        }
        globalThis.atlasSidebar = [...(options.sidebar ?? []), group]
    }

    return {
        name: '@lameuler/atlas',
        hooks: {
            'astro:config:setup': async ({ injectRoute, updateConfig, config: astroConfig }) => {
                injectRoute({
                    pattern: '[...slug]',
                    entrypoint: '@lameuler/atlas/pages/entry.astro',
                })
                injectRoute({
                    pattern: '404',
                    entrypoint: '@lameuler/atlas/pages/404.astro',
                })
                globalThis.atlasSidebar = options.sidebar ?? []
                config = astroConfig
                if (options.reference) {
                    injectRoute({
                        pattern: `${base ? base + '/' : ''}[...id]`,
                        entrypoint: '@lameuler/atlas/pages/model.astro',
                    })
                    await loadReferenceData()
                }
                const updatedConfig = updateConfig({
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
                                '@lameuler/atlas:virtual': `export const options = ${JSON.stringify(options)}; export const buildConfig = ${JSON.stringify(updatedConfig.build)}`,
                            }),
                        ],
                    },
                    markdown: {
                        rehypePlugins: [rehypeAside, [rehypeLinks, updatedConfig]],
                    },
                })
                globalThis.atlasAstroMarkdownOptions = finalConfig.markdown
            },
            'astro:config:done': (options) => {
                config = options.config
            },
            'astro:server:setup': ({ server, logger }) => {
                server.watcher.add(referenceFiles)
                server.watcher.on('change', async (path) => {
                    if (referenceFiles.includes(path)) {
                        logger.info('reloading reference data...')
                        await loadReferenceData()
                        server.watcher.add(referenceFiles)
                    }
                })
            },
        },
    }
}
