import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

export const collections = {
    docs: defineCollection({
        loader: glob({ pattern: '**/*.md', base: './src/content' }),
        schema: z.object({
            title: z.string(),
            description: z.string().optional(),
        }),
    }),
}
