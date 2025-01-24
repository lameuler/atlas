import { relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import type { AstroConfig } from 'astro'
import type { ElementContent, Root } from 'hast'
import { h } from 'hastscript'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

import { getId } from './content.js'
import { canonicalPathname, getEntryPathname } from './util.js'

const ALERTS: Record<string, { title: string; icon: string[] }> = {
    NOTE: {
        title: 'Note',
        icon: ['M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0', 'M12 9h.01', 'M11 12h1v4h1'],
    },
    TIP: {
        title: 'Tip',
        icon: [
            'M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7',
            'M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3',
            'M9.7 17l4.6 0',
        ],
    },
    IMPORTANT: {
        title: 'Important',
        icon: [
            'M8 9h8',
            'M8 13h6',
            'M15 18l-3 3l-3 -3h-3a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v5.5',
            'M19 16v3',
            'M19 22v.01',
        ],
    },
    WARNING: {
        title: 'Warning',
        icon: [
            'M12 9v4',
            'M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z',
            'M12 16h.01',
        ],
    },
    CAUTION: {
        title: 'Caution',
        icon: [
            'M12.802 2.165l5.575 2.389c.48 .206 .863 .589 1.07 1.07l2.388 5.574c.22 .512 .22 1.092 0 1.604l-2.389 5.575c-.206 .48 -.589 .863 -1.07 1.07l-5.574 2.388c-.512 .22 -1.092 .22 -1.604 0l-5.575 -2.389a2.036 2.036 0 0 1 -1.07 -1.07l-2.388 -5.574a2.036 2.036 0 0 1 0 -1.604l2.389 -5.575c.206 -.48 .589 -.863 1.07 -1.07l5.574 -2.388a2.036 2.036 0 0 1 1.604 0z',
            'M12 8v4',
            'M12 16h.01',
        ],
    },
}

export const rehypeAside: Plugin<[], Root> = () => {
    return (tree) => {
        visit(tree, 'element', (node) => {
            if (node.tagName === 'blockquote') {
                const p = node.children.find((child) => child.type === 'element')
                if (!p || p.tagName !== 'p') return

                const start = p.children[0]
                if (start.type !== 'text') return
                const match = start.value.match(/^\s*\[!([a-zA-Z]+)\]/)
                if (match) {
                    const type = match[1]
                    const alert = ALERTS[type.toUpperCase()]
                    if (alert) {
                        start.value = start.value.substring(match[0].length)
                        node.tagName = 'aside'
                        node.properties.class = type.toLowerCase()
                        const title: ElementContent[] = []
                        for (let i = p.children.length; i > 0; i--) {
                            const child = p.children.shift()
                            if (!child) break

                            if (child.type === 'text') {
                                const br = child.value.indexOf('\n')
                                if (br >= 0) {
                                    const titleEnd = child.value.substring(0, br)
                                    if (titleEnd.trim().length > 0) {
                                        title.push({
                                            ...child,
                                            value: titleEnd,
                                        })
                                    }
                                    const bodyStart = child.value.substring(br + 1)
                                    if (bodyStart.trim().length > 0) {
                                        p.children.unshift({
                                            ...child,
                                            value: bodyStart,
                                        })
                                    }
                                    break
                                }
                                if (child.value.trim().length === 0) {
                                    continue
                                }
                            }

                            title.push(child)
                        }

                        if (p.children.length === 0) {
                            node.children = node.children.filter((child) => child !== p)
                        }

                        if (title.length === 0) {
                            title.push({
                                type: 'text',
                                value: alert.title,
                            })
                        }

                        node.children.unshift(
                            h(
                                'div.title',
                                {},
                                h(
                                    'svg',
                                    { viewBox: '0 0 24 24', width: 20, height: 20, class: 'icon' },
                                    ...alert.icon.map((d) => h('path', { d })),
                                ),
                                h('div', {}, ...title),
                            ),
                        )
                    }
                }
            }
        })
    }
}

export const rehypeLinks: Plugin<[AstroConfig], Root> = (config) => {
    return async (tree, vfile) => {
        if (!vfile.path) return

        const promises: Promise<void>[] = []

        visit(tree, 'element', (node) => {
            if (node.tagName !== 'a' || typeof node.properties.href !== 'string') return

            const href = node.properties.href
            if (href.startsWith('#') || href.startsWith('/')) return

            const fileUrl = new URL(node.properties.href, pathToFileURL(vfile.path))
            if (fileUrl.protocol !== 'file:') return

            const filePath = fileURLToPath(fileUrl)

            promises.push(
                getId(filePath)
                    .then((id) => {
                        // treat url as refernce to entry
                        node.properties.href =
                            getEntryPathname(id, config.base, config.build.format) +
                            fileUrl.search +
                            fileUrl.hash
                    })
                    .catch(() => {
                        // treat url as just a normal relative url
                        const loaderBase = globalThis.atlasLoaderOptions?.base
                        if (!loaderBase) return
                        const contentDir =
                            typeof loaderBase === 'string' ? loaderBase : fileURLToPath(loaderBase)
                        const fileId = relative(contentDir, vfile.path)
                            .replaceAll(sep, '/')
                            .replace(/^(\.\.\/)+/, '')

                        const from = getEntryPathname(fileId, config.base, 'preserve')
                        const url = new URL(href, new URL(from, 'base://'))
                        node.properties.href = canonicalPathname(url.pathname, config.build.format) + url.search + url.hash
                    }),
            )
        })

        await Promise.all(promises)
    }
}
