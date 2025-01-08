import { readFile } from 'node:fs/promises'
import { extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseFrontmatter } from '@astrojs/markdown-remark'
import { type Loader, glob } from 'astro/loaders'
import { slug } from 'github-slugger'
import { z } from 'zod'

const page = z
    .object({
        page: z.string(),
        label: z.string(),
    })
    .or(z.string())

const schema = z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    prev: page.optional(),
    next: page.optional(),
})

/** @deprecated */
export const docsSchema = schema

export type LoaderOptions = {
    base: string | URL
    generateId?: (options: { entry: string; base: URL; data: Record<string, unknown> }) => string
}

export function docsLoader(options: LoaderOptions): Loader {
    globalThis.atlasLoaderOptions = options
    const loader = glob({ pattern: '**/*.{md,mdx}', base: options.base })
    return {
        name: 'atlas:loader',
        load: (context) => {
            globalThis.atlasLoaderStore = context.store
            return loader.load(context)
        },
        schema,
    }
}

export async function getId(entry: string) {
    const options = globalThis.atlasLoaderOptions
    if (!options) throw new Error('atlas loader options not found')
    const base = typeof options.base === 'string' ? options.base : fileURLToPath(options.base)
    const full = resolve(base, entry)

    const loaded = globalThis.atlasLoaderStore
        ?.values()
        .find((e) => e.filePath && resolve(e.filePath) === full)
    if (loaded) {
        return loaded.id
    }

    const contents = await readFile(full, 'utf8')
    const result = parseFrontmatter(contents, { frontmatter: 'empty-with-spaces' })
    const data = result.frontmatter
    if (data.slug) {
        return String(data.slug)
    }
    const relativePath = relative(base, entry)
    if (relativePath.startsWith('..')) throw new Error('invalid entry path')

    const ext = extname(relativePath)
    const withoutExt = relativePath.slice(0, -ext.length)
    const rawSegments = withoutExt.split(sep)
    return rawSegments
        .map((segment) => slug(segment))
        .join('/')
        .replace(/\/index$/, '')
}
