import { docsLoader } from '@lameuler/atlas/content'
import { defineCollection } from 'astro:content'

export const collections = {
    docs: defineCollection({
        loader: docsLoader({ base: 'src/content' }),
    }),
}
