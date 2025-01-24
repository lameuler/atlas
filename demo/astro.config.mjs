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
                        '/',
                        'configuration',
                        'troubleshooting',
                        'markdown',
                        'https://ler.quest/astro-pdf',
                        'typebox',
                        {
                            label: 'View on GitHub',
                            page: 'https://github.com/lameuler/astro-pdf',
                        },
                        'dir/',
                    ],
                },
            ],
            reference: {
                sidebarName: 'API',
                base: 'reference',
                entries: ['../temp/astro-pdf/src/index.ts', '../temp/astro-pdf/src/other/index.ts'],
                tsconfig: '../temp/astro-pdf/tsconfig.json',
                resolveLink(id) {
                    const mod = id.toDeclarationReference().moduleSource
                    switch (mod) {
                        case 'puppeteer':
                            return `https://pptr.dev/api/puppeteer.${id.qualifiedName.toLowerCase()}`
                        case '@puppeteer/browsers':
                            return `https://pptr.dev/browsers-api/browsers.${id.qualifiedName.toLowerCase()}`
                        case 'astro': {
                            if (id.qualifiedName === 'AstroConfig') {
                                return 'https://docs.astro.build/en/reference/configuration-reference/'
                            }
                            break
                        }
                    }
                },
                releaseInfo(version) {
                    return {
                        name: `astro-pdf@${version}`,
                        url: `https://github.com/lameuler/astro-pdf/releases/tag/astro-pdf%40${version}`,
                    }
                },
            },
        }),
    ],
})
