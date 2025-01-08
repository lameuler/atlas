import { readFile } from 'node:fs/promises'
import { extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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

type GenerateIdOptions = {
    entry: string
    base: URL
    data: Record<string, unknown>
}

export type LoaderOptions = {
    base: string | URL
    generateId?: (options: GenerateIdOptions) => string
}

function defaultGenerateId({ entry, data }: GenerateIdOptions) {
    if (data.slug) {
        return String(data.slug)
    }

    const withoutExt = entry.slice(0, entry.length - extname(entry).length)
    const rawSegments = withoutExt.split(sep)
    return rawSegments
        .map((segment) => slug(segment))
        .join('/')
        .replace(/(^|\/)index$/, '/')
}

export function docsLoader(options: LoaderOptions): Loader {
    const generateId = options.generateId ?? defaultGenerateId
    globalThis.atlasLoaderOptions = {
        base: options.base,
        generateId,
    }
    const loader = glob({ pattern: '**/*.{md,mdx}', base: options.base, generateId })
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
    const relativeEntry = relative(base, full)
    if (relativeEntry.startsWith('..')) throw new Error(`invalid entry path: ${entry}`)

    return options.generateId({ entry: relativeEntry, base: pathToFileURL(base), data })
}
