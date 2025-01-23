import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import sitemap from '@astrojs/sitemap'
import svelte from '@astrojs/svelte'
import virtual from '@rollup/plugin-virtual'
import type { AstroConfig, AstroIntegration } from 'astro'
import { Element } from 'hast'
import { h } from 'hastscript'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
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

const copyIcon = makeIcon([
    'M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z',
    'M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1',
])
const linkIcon = makeIcon([
    'M9 15l6 -6',
    'M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464',
    'M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463',
])

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
                            transformers: [
                                {
                                    pre(node: Element) {
                                        node.children.push(
                                            h('button', { dataCopyPrevious: '' }, copyIcon),
                                        )
                                    },
                                },
                            ],
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
                updateConfig({
                    markdown: {
                        rehypePlugins: [
                            rehypeHeadingIds,
                            [rehypeAutolinkHeadings, { behavior: 'append', content: linkIcon }],
                        ],
                    },
                })
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

function makeIcon(paths: string[], size = 20) {
    return h(
        'svg.icon',
        { viewBox: '0 0 24 24', width: size, height: size },
        ...paths.map((d) => h('path', { d })),
    )
}
