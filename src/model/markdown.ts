import { RehypePlugin, RemarkPlugin, rehypeShiki } from '@astrojs/markdown-remark'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import remarkSmartypants from 'remark-smartypants'
import { unified } from 'unified'

async function loadPlugins<T>(plugins?: (string | [string, unknown] | T | [T, unknown])[]) {
    if (!Array.isArray(plugins)) {
        return []
    }
    const result: [T, unknown][] = []
    for (const [plugin, options] of plugins.map((p) => (Array.isArray(p) ? p : [p]))) {
        if (typeof plugin === 'string') {
            result.push([(await import(/* @vite-ignore */ plugin)).default, options])
        } else {
            result.push([plugin, options])
        }
    }
    return result
}

let _processor: ReturnType<typeof createProcessor> | undefined = undefined

async function createProcessor() {
    const parser = unified().use(remarkParse).use(remarkGfm).use(remarkSmartypants)
    for (const [plugin, options] of await loadPlugins<RemarkPlugin>(
        globalThis.atlasAstroMarkdownOptions?.remarkPlugins,
    )) {
        parser.use(plugin, options)
    }

    parser.use(remarkRehype).use(rehypeShiki, globalThis.atlasAstroMarkdownOptions?.shikiConfig)
    for (const [plugin, options] of await loadPlugins<RehypePlugin>(
        globalThis.atlasAstroMarkdownOptions?.rehypePlugins,
    )) {
        parser.use(plugin, options)
    }

    return parser.use(rehypeStringify)
}

export async function getProcessor() {
    return await (_processor ??= createProcessor())
}

async function createInlineProcessor() {
    const parser = unified().use(remarkParse).use(remarkGfm).use(remarkSmartypants)
    for (const [plugin, options] of await loadPlugins<RemarkPlugin>(
        globalThis.atlasAstroMarkdownOptions?.remarkPlugins,
    )) {
        parser.use(plugin, options)
    }
    parser.use(remarkRehype)
    for (const [plugin, options] of await loadPlugins<RehypePlugin>(
        globalThis.atlasAstroMarkdownOptions?.rehypePlugins,
    )) {
        parser.use(plugin, options)
    }
    return parser
        .use(rehypeSanitize, {
            strip: ['script'],
            ancestors: {},
            protocols: { href: ['http', 'https'] },
            tagNames: ['code', 'strong', 'b', 'em', 'i', 'strike', 's', 'del', 'a'],
            attributes: {
                a: ['href'],
                '*': ['title'],
            },
        })
        .use(rehypeStringify)
}

let _inlineProcessor: ReturnType<typeof createInlineProcessor> | undefined = undefined

export async function getInlineProcessor() {
    return await (_inlineProcessor ??= createInlineProcessor())
}
