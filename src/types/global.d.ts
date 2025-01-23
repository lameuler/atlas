/* eslint-disable no-var */
import { AstroConfig } from 'astro'
import { DataStore } from 'astro/loaders'

import { LoaderOptions } from '../content.js'
import { Named } from '../model/model.js'
import { Group } from '../sidebar.ts'

declare global {
    var atlasPreviews: { id: string; group?: string; title: string }[] | undefined
    var atlasSidebar: Group[] | undefined
    var atlasLoaderStore: DataStore | undefined
    var atlasLoaderOptions: Required<LoaderOptions> | undefined
    var atlasAstroMarkdownOptions: AstroConfig['markdown'] | undefined
    var atlasReference:
        | {
              pages: { id: string; href: string; named: Named }[]
          }
        | undefined
}
