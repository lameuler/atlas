// @ts-check
import atlas from '@lameuler/atlas'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
    site: 'https://ler.quest',
    base: '/astro-notebook',
    integrations: [
        atlas({
            name: 'astro-notebook',
            github: 'atlas',
            sidebar: [
                {
                    name: 'Guides',
                    pages: [
                        'index',
                        'configuration',
                        'troubleshooting',
                        'markdown',
                        'https://ler.quest/astro-pdf',
                        'typebox',
                        {
                            label: 'View on GitHub',
                            page: 'https://github.com/lameuler/astro-pdf',
                        },
                    ],
                },
            ],
        }),
    ],
})
