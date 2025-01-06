import type { AstroIntegration } from 'astro'
import { AtlasOptions } from './index.js'
import { launch } from 'puppeteer'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

globalThis.atlasPreviews = []

export default function previews(options: AtlasOptions): AstroIntegration {
    let assets = 'assets'
    return {
        name: 'atlas:previews',
        hooks: {
            'astro:config:done': ({ config }) => {
                assets = config.build.assets
            },
            'astro:build:done': async ({ dir, logger }) => {
                if (globalThis.atlasPreviews.length > 0) {
                    const start = Date.now()
                    logger.info(`generating preview images for ${globalThis.atlasPreviews.length} pages`)
                    const { name, badge } = options
                    const browser = await launch()
                    try {
                        const page = await browser.newPage()
                        try {
                            await page.setViewport({
                                width: 1200,
                                height: 630
                            })
                            await page.goto(new URL('./pages/previews.html', import.meta.url).href, {
                                waitUntil: 'networkidle0'
                            })
                            await page.$eval('#name', (el, name) => el.textContent = name, name)
                            if (badge) {
                                await page.$eval('#badge', (el, badge) => {
                                    el.textContent = badge
                                    el.classList.remove('hidden')
                                }, badge)
                            }
                            for (const entry of globalThis.atlasPreviews) {
                                await page.$eval('#group', (el, group) => el.textContent = group, entry.group || '')
                                await page.$eval('#title', (el, title) => el.textContent = title, entry.title)
                                await page.screenshot({
                                    encoding: 'binary',
                                    type: 'png',
                                    captureBeyondViewport: false,
                                    path: join(fileURLToPath(dir), assets, entry.id)
                                })
                            }
                        } finally {
                            await page.close()
                        }
                    } finally {
                        await browser.close()
                    }
                    logger.info(`completed in ${Date.now()-start}ms`)
                }
            }
        }
    }
}

const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function addEntry({ title, group }: { title: string, group?: string }): string {
    let id = '_preview.'
    for (let i = 0; i < 10; i++) {
        id += CHARS[Math.round(Math.random() * CHARS.length)]
    }
    id += '.png'
    globalThis.atlasPreviews.push({ id, title, group })
    return id
}
