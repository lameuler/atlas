# @lameuler/atlas

Astro documentation theme for [ler.quest](https://ler.quest). This is not currently customizable to be used by any other site.

## Example

Refer to the [demo](./demo) project

```js
// astro.config.mjs
import atlas from '@lameuler/atlas'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
    site: 'https://ler.quest',
    base: '/atlas', // required
    integrations: [
        atlas({
            name: 'Atlas',
            github: 'atlas',
            sidebar: [
                {
                    // specify sidebar groups with pages
                    name: 'Guides',
                    pages: [
                        'index',
                        'configuration',
                        'troubleshooting',
                        'markdown',
                        'typebox',
                        'https://ler.quest/astro-pdf',
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
```

```ts
// src/content.config.ts
import { docsLoader } from '@lameuler/atlas/content'
import { defineCollection } from 'astro:content'

export const collections = {
    docs: defineCollection({
        loader: docsLoader({ base: 'src/content' }),
    }),
}
```

Remove the src/pages directory and put all pages in the content collection.
