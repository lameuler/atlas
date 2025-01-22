/* eslint-disable no-var */
import { AstroConfig } from 'astro'
import { DataStore } from 'astro/loaders'

import { LoaderOptions } from '../content.js'

declare global {
    var atlasPreviews: { id: string; group?: string; title: string }[]
    var atlasLoaderStore: DataStore | undefined
    var atlasLoaderOptions: Required<LoaderOptions> | undefined
    var atlasAstroMarkdownOptions: AstroConfig['markdown'] | undefined
}
