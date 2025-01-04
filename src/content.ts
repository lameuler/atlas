import { z } from 'zod'

const page = z
    .object({
        page: z.string(),
        label: z.string(),
    })
    .or(z.string())

export const docsSchema = z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    prev: page.optional(),
    next: page.optional(),
})
