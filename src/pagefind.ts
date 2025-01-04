import { fileURLToPath } from 'node:url'

import type { AstroIntegration } from 'astro'
import { createIndex } from 'pagefind'

export default function pagefind(): AstroIntegration {
    return {
        name: 'atlas:pagefind',
        hooks: {
            'astro:build:done': async ({ dir, logger }) => {
                const { index, errors: indexErrors } = await createIndex()
                if (!index || indexErrors.length > 0) {
                    logger.error('failed to create pagefind index:')
                    indexErrors.forEach(logger.error)
                    return
                }
                const { page_count, errors: addDirErrors } = await index.addDirectory({
                    path: fileURLToPath(dir),
                })
                if (addDirErrors.length > 0) {
                    logger.error('failed to add output directory:')
                    addDirErrors.forEach(logger.error)
                } else {
                    logger.info(`added ${page_count} pages to pagefind index`)
                }
                const { errors: writeFilesErrors } = await index.writeFiles({
                    outputPath: fileURLToPath(new URL('_pagefind', dir)),
                })
                if (writeFilesErrors.length > 0) {
                    logger.error('failed to write index files')
                    writeFilesErrors.forEach(logger.error)
                } else {
                    logger.info('successfully wrote index files')
                }
            },
        },
    }
}
