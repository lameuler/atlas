---
title: Getting Started
---

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import pdf from 'astro-pdf'

/*https://example.com*/
// refer to https://astro.build/config. (or https://astro.build/config#)
export default defineConfig({
    integrations: [
        pdf({
            // specify base options as defaults for pages
            baseOptions: {
                path: '/pdf[pathname].pdf',
                waitUntil: 'networkidle2',
                maxRetries: 2,
                ...
            },
            // max number of pages to load at once
            maxConcurrent: 2,
            // pages will receive the pathname of each page being built
            pages: {
                '/some-page': '/pages/some.pdf', // output path
                '/other-page': true, // outputs to /other-page.pdf
                'https://example.com': [
                    {
                        path: 'example.pdf',
                        screen: true, // use screen media type instead of print
                        waitUntil: 'networkidle0', // for Puppeteer page loading
                        navTimeout: 40_000,
                        maxRetries: 0,
                        throwOnFail: true,
                        viewport: { // Puppeteer Viewport
                            width: 800,
                            height: 600,
                            // https://github.com/puppeteer/puppeteer/issues/3910
                            deviceScaleFactor: 3
                        }
                        pdf: { // Puppeteer PDFOptions
                            format: 'A4',
                            printBackground: true,
                            timeout: 20_000
                        },
                        isolated: true // do not share cookies with other pages
                    },
                    'basic-example.pdf'
                ],
                ...,
                fallback: (pathname) => ... // receives pathnames not specified above
            }
        })
    ]
});
```
