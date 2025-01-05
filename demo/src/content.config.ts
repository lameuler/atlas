import { docsSchema } from '@lameuler/atlas/content'
import { glob } from 'astro/loaders'
import { defineCollection } from 'astro:content'

export const collections = {
    docs: defineCollection({
        loader: glob({ pattern: '**/*.md', base: './src/content' }),
        schema: docsSchema,
    }),
}
