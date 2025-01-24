import { extname } from 'node:path'

export function getEntryPathname(
    id: string,
    base: string,
    buildFormat: 'directory' | 'file' | 'preserve',
) {
    const ext = extname(id)
    id = id.slice(0, id.length - ext.length)
    if (id.endsWith('/index')) {
        id = id.slice(0, -5)
    }
    if (buildFormat === 'file' && id.endsWith('/')) {
        id = id.slice(0, -1)
    }
    if (id.startsWith('/')) {
        id = id.slice(1)
    }
    let href = base.replace(/\/+$/, '') + '/' + id
    if (buildFormat === 'directory' && !href.endsWith('/')) {
        href += '/'
    }
    return href
}

export function canonicalPathname(
    pathname: string,
    buildFormat: 'directory' | 'file' | 'preserve',
) {
    pathname = pathname.replace(/\/+$/, '/')
    if (buildFormat === 'preserve' || pathname === '/') {
        return pathname
    }
    if (buildFormat === 'file' && pathname.endsWith('/')) {
        return pathname.slice(0, -1)
    }
    if (buildFormat === 'directory' && !pathname.endsWith('/')) {
        return pathname + '/'
    }
    return pathname
}
