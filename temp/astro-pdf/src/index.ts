/**
 * This is the documentation for `astro-pdf`.
 *
 * See {@link Options} for the configuration options.
 *
 * > [!IMPORTANT]
 * > These docs are a work in progress and may not be complete
 * @module
 */
import EventEmitter from 'node:events'
import { extname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { type AstroConfig, type AstroIntegration } from 'astro'
import { LocalImageProps } from 'astro/assets'
import { bgBlue, blue, bold, dim, green, red, yellow } from 'kleur/colors'
import pMap from 'p-map'
import { launch } from 'puppeteer'

import { findOrInstallBrowser } from './browser.js'
import {
    type Options,
    type PageOptions,
    defaultPageOptions,
    getPageOptions,
    mergePages,
} from './options.js'
import _other, { Other } from './other/index.js'
import { FatalError, PageError, processPage } from './page.js'
import { type ServerOutput, astroPreview } from './server.js'

const VERSION = '0'

/**
 * The other entrypoint of
 * @remarks
 * Returns the value of {@link _other | astro\n-pdf/other } oh
 */
export function other(): Other {
    return _other
}

/**
 * Super real type
 *
 * @remarks
 *
 * Consider using {@link FakeClass.what }
 *
 * See also: {@link https://github.com/microsoft/tsdoc}
 */
export type FakeType = {
    blue: typeof blue
    emitter: EventEmitter
    other: Awaited<ReturnType<typeof import('shiki/engine/oniguruma').createOnigurumaEngine>>
    props: LocalImageProps<unknown>
    maker: {
        new <T>(old: T): T
        <R>(r: { new (): R }): R
    }
    // eslint-disable-next-line @typescript-eslint/no-misused-new
    constructor(): FakeType
}

/**
 * An extremely real&trade; interface. &copy;
 *
 * > [!NOTE]
 * > This is not a real interface
 *
 * @typeParam T - the type contained by `FakeInterface`
 */
export interface FakeInterface<T> {
    new <R>(r: { new (): R }): T
    /**
     * Process an array of T
     *
     * @example
     * ```ts
     * const f: FakeInterface<string> = ...
     * f(['a', 'b', 'c'])
     * ```
     *
     * @example
     * This can be used in many ways
     * ```ts
     * const f: FakeInterface<string|number> = ...
     * f([1, 2, 3, 'go!'])
     * ```
     */
    (n: T[]): void
    [n: number]: { new (): T[] }
    // eslint-disable-next-line @typescript-eslint/no-misused-new
    constructor(): T
    FakeInterface: 'string'
    get a(): number
    /**
     * @example
     * f.a = '1'
     * console.log(f.a) // 1
     *
     * @param n - String value to be converted to number
     */
    set a(n: string)
    /**
     * @interface
     * */
    opts: {
        a: string
        b: number
    }
    /**
     * fn
     *
     * @remarks
     * This is a very versatile function
     *
     * @returns nothing
     *
     * @param a - Array of items to be converted to string
     * @param b - Function to convert each item to string
     *
     * @typeParam T - The type of each item to be converted to string
     * @alpha
     */
    fn: { <T>(a: T[], b: (t: T) => string): string[] } | false
    /**
     * Convert a number to a string
     * @param n The number to convert to string
     */
    convert(n: number): string
    /**
     * Convert a string to a number
     * @param s The string to convert to number
     * @beta
     */
    convert(s: string): number
}

const f: FakeInterface<string> = {} as FakeInterface<string>
f.constructor()

/**
 * @remarks
 * > [!NOTE]
 * > This is not a real class
 */
export class FakeClass<T> {
    constructor(protected t: T) {}
    what(t: T): { new (t: T): FakeClass<T> } {
        void t
        return FakeClass
    }
    static what() {
        return ''
    }
}

export const EnumAtHome = {
    A: 'a',
    B: 'b',
} as const

export type EnumAtHome = (typeof EnumAtHome)[keyof typeof EnumAtHome]

/**
 * **this is important**. like _reallyyyy_ important
 *
 * @remarks
 * |a |b |
 * |--|--|
 * |1 | 2|
 *
 * ok then... --- this is the way
 * ``whatt``
 * ``or''
 *
 * > hey
 * > there
 *
 * ---
 *
 * @param options - `astro-pdf` options
 * @returns The `astro-pdf` Astro integration.
 *
 * @public
 */
export default function pdf(options: Options): AstroIntegration {
    let cacheDir: string
    let astroConfig: AstroConfig
    return {
        name: 'astro-pdf',
        hooks: {
            'astro:config:done': ({ config }) => {
                astroConfig = config
                cacheDir = fileURLToPath(config.cacheDir)
            },
            'astro:build:done': async ({ dir, pages, logger }) => {
                const forked = logger.fork('')
                logger = {
                    ...logger,
                    fork: logger.fork,
                    info: (message: string) => forked.info(message),
                    warn: logger.warn,
                    error: logger.error,
                    debug: logger.debug,
                }

                if (typeof cacheDir !== 'string') {
                    logger.error('cacheDir is undefined. ending execution...')
                    return
                }

                const basePageOptions = {
                    ...defaultPageOptions,
                    ...options.baseOptions,
                }

                const startTime = Date.now()
                const versionColour = VERSION.includes('-') ? yellow : green
                logger.info(
                    `\r${bold(bgBlue(' astro-pdf '))} ${versionColour('v' + VERSION)} – generating pdf files`,
                )

                try {
                    if (typeof options.runBefore === 'function') {
                        logger.info(dim('running runBefore hook...'))
                        const runStart = Date.now()
                        await options.runBefore(dir)
                        logger.debug(
                            `finished running runBefore hook in ${Date.now() - runStart}ms`,
                        )
                    }

                    const executablePath = await findOrInstallBrowser(
                        options.install,
                        cacheDir,
                        logger,
                    )
                    logger.debug(`using browser at ${blue(executablePath)}`)

                    const outDir = fileURLToPath(dir)

                    // run astro preview
                    let serverFn = options.server
                    if (serverFn === false) {
                        logger.debug('running without server')
                    } else if (typeof serverFn !== 'function') {
                        logger.debug('running astro preview server')
                        serverFn = astroPreview
                    } else {
                        logger.debug('running custom server')
                    }
                    let url: URL | undefined = undefined
                    let close: ServerOutput['close'] = undefined
                    if (serverFn) {
                        try {
                            const server = await serverFn(astroConfig)
                            url = server.url
                            close = server.close
                        } catch (e) {
                            throw new Error('error when setting up server: ' + e)
                        }
                        if (url) {
                            logger.info(`using server at ${blue(url.href)}`)
                        } else {
                            logger.warn(
                                `no url returned from server. all locations must be full urls.`,
                            )
                        }
                    }

                    const browser = await launch({
                        executablePath,
                        ...options.launch,
                    })
                    logger.debug(`launched browser ${await browser.version()}`)

                    const controller = new AbortController()

                    function onDisconnected() {
                        controller.abort(
                            new FatalError('Fatal error: Browser disconnected unexpectedly'),
                        )
                        console.log('browser disconnected')
                    }
                    browser.on('disconnected', onDisconnected)

                    await Promise.all((await browser.pages()).map((page) => page.close()))

                    const { locations, map, fallback } = mergePages(pages, options.pages)

                    const queue: { location: string; pageOptions: PageOptions }[] = []
                    locations.forEach((location) => {
                        const arr = getPageOptions(location, basePageOptions, map, fallback)
                        queue.push(...arr.map((pageOptions) => ({ location, pageOptions })))
                    })

                    const concurrency = Math.max(
                        options.maxConcurrent ?? Number.POSITIVE_INFINITY,
                        1,
                    )

                    const signal = controller.signal
                    EventEmitter.setMaxListeners(Math.min(queue.length, concurrency) + 1, signal)

                    const env = {
                        outDir,
                        browser,
                        baseUrl: url,
                        signal,
                        debug: (message: string) => logger.debug(message),
                        warn: (message: string) => logger.warn(message),
                    }

                    let totalCount = queue.length

                    const generated: string[] = []

                    async function task(location: string, pageOptions: PageOptions, i: number = 1) {
                        const maxRuns = Math.max(pageOptions.maxRetries ?? 0, 0) + 1
                        const start = Date.now()
                        const retryInfo = maxRuns > 1 ? ` (${i}/${maxRuns} attempts)` : ''
                        try {
                            const result = await processPage(location, pageOptions, env)
                            const pathname = result.output.pathname
                            generated.push(pathname)

                            const time = Date.now() - start
                            const src = result.src ? dim(' ← ' + result.src) : ''
                            const attempts = i > 1 ? dim(retryInfo) : ''
                            logger.info(`${green('▶')} ${result.location}${src}${attempts}`)

                            const out = extname(pathname) !== '.pdf' ? yellow(pathname) : pathname
                            logger.info(
                                `  ${blue('└─')} ${dim(`${out} (+${time}ms) (${generated.length}/${totalCount})`)}`,
                            )
                        } catch (err) {
                            const attempts =
                                maxRuns > 1 && i < maxRuns ? yellow(retryInfo) : retryInfo

                            if (err instanceof PageError) {
                                if (i < maxRuns || !pageOptions.throwOnFail) {
                                    const time = Date.now() - start
                                    const src = err.src ? dim(' ← ' + err.src) : ''
                                    logger.info(
                                        red(
                                            `✖︎ ${err.location} (${err.title}) ${dim(`(+${time}ms)`)}${src}${attempts}`,
                                        ),
                                    )
                                }
                                const causeStack =
                                    err.cause instanceof Error
                                        ? `\n${bold('Caused by:')}\n${err.cause.stack}`
                                        : ''
                                logger.debug(
                                    bold(red(`error while processing ${location}:\n`)) +
                                        err.stack +
                                        causeStack,
                                )
                            } else {
                                if (err instanceof FatalError) {
                                    throw err
                                }
                                // wrap unexpected errors with a more useful message
                                throw new Error(
                                    `An unexpected error occurred and was not handled by astro-pdf while processing \`${location}\`:\n\n` +
                                        err +
                                        '\n\nConsider filing a bug report at https://github.com/lameuler/astro-pdf/issues/new/choose\n',
                                )
                            }

                            if (i < maxRuns) {
                                await task(location, pageOptions, i + 1)
                            } else {
                                totalCount--
                                if (pageOptions.throwOnFail) {
                                    throw err
                                }
                            }
                        }
                    }

                    try {
                        if (typeof options.browserCallback === 'function') {
                            await options.browserCallback(browser)
                        }
                        await pMap(
                            queue,
                            ({ location, pageOptions }) => task(location, pageOptions),
                            {
                                concurrency,
                                signal,
                            },
                        )
                    } catch (err) {
                        if (!signal.aborted) {
                            controller.abort(err)
                        }
                        throw err
                    } finally {
                        await browser.off('disconnected', onDisconnected).close()
                        if (typeof close === 'function') {
                            await close()
                        }

                        const noExt = generated.filter((path) => extname(path) !== '.pdf').length
                        if (noExt > 0) {
                            logger.warn(
                                `${noExt} file${noExt === 1 ? '' : 's'} generated without .pdf extension`,
                            )
                        }

                        if (generated.length < queue.length) {
                            const n = queue.length - generated.length
                            logger.error(red(`Failed to generate ${n} file${n === 1 ? '' : 's'}`))
                        }
                    }

                    if (typeof options.runAfter === 'function') {
                        logger.info(dim('running runAfter hook...'))
                        const runStart = Date.now()
                        await options.runAfter(dir, generated)
                        logger.debug(`finished running runAfter hook in ${Date.now() - runStart}ms`)
                    }

                    logger.info(green(`✓ Completed in ${Date.now() - startTime}ms.\n`))
                } catch (error) {
                    logger.info(red(`✖︎ Failed after ${Date.now() - startTime}ms.\n`))
                    if (options.throwErrors ?? true) {
                        throw error
                    } else if (error instanceof Error && error.stack) {
                        if (error.cause instanceof Error) {
                            logger.error(
                                `${error.stack}\n\n${bold('Caused by:')}\n${error.cause.stack}\n`,
                            )
                        } else {
                            logger.error(error.stack + '\n')
                        }
                    } else {
                        logger.error(error + '\n')
                    }
                }
            },
        },
    }
}

export type { Options, PageOptions }
export type { PagesEntry, PagesFunction, PagesMap, PDFOptions } from './options.js'
export type { ServerOutput } from './server.js'
