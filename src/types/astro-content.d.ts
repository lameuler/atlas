declare module 'astro:content' {
    export interface RenderResult {
        Content: import('astro/runtime/server/index.js').AstroComponentFactory
        headings: import('astro').MarkdownHeading[]
        remarkPluginFrontmatter: Record<string, unknown>
    }
    interface Render {
        '.md': Promise<RenderResult>
    }

    export interface RenderedContent {
        html: string
        metadata?: {
            imagePaths: Array<string>
            [key: string]: unknown
        }
    }

    export function getCollection(collection: 'docs'): Promise<DocsEntry[]>

    export function render(entry: DocsEntry): Promise<RenderResult>

    type DocsEntry = {
        id: string
        body?: string
        collection: 'docs'
        data: import('zod').infer<typeof import('../content.ts').docsSchema>
        rendered?: RenderedContent
        filePath?: string
    }

    type DataEntryMap = {
        docs: Record<string, DocsEntry>
    }
}
