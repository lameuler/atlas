// @ts-check
import { existsSync } from 'node:fs'
import { copyFile, lstat, mkdir, rm, symlink } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

import { glob } from 'glob'

const outdir = 'dist'

if (existsSync(outdir)) {
    await rm(outdir, { recursive: true })
}

const files = await glob('src/**/*', { ignore: '**/*.ts' })

const linkMode = process.argv.includes('--link') || process.argv.includes('-l')
if (linkMode) {
    console.log('running in symlink mode')
}

for (const file of files) {
    const stat = await lstat(file)
    if (stat.isFile()) {
        const suffix = ['B', 'KB', 'MB', 'GB', 'TB']
        let i = 0,
            size = stat.size
        while (size >= 1000 && i < suffix.length - 1) {
            i++
            size /= 1000
        }
        const dest = join('./dist', relative('src', file))
        await mkdir(dirname(dest), { recursive: true })
        if (linkMode) {
            await symlink(resolve(file), dest)
        } else {
            await copyFile(file, dest)
        }
        console.log(`${dest} (${size.toPrecision(3)}${suffix[i]})`)
    }
}
