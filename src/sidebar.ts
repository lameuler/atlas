import { buildConfig } from '@lameuler/atlas:virtual'
import { getCollection } from 'astro:content'

import { getEntryPathname } from './util.js'

const entries = await getCollection('docs')

export type ResolvedGroup = {
    pages: {
        href: string
        label: string
        external?: boolean
    }[]
    name?: string
    prevGroupNav?: boolean
    nextGroupNav?: boolean
}

export function getGroups() {
    const groups: ResolvedGroup[] = []
    for (const group of globalThis.atlasSidebar ?? []) {
        const pages: { href: string; label: string; external?: boolean }[] = []
        for (const page of group.pages) {
            const info = getPageInfo(page)
            if (info) {
                pages.push(info)
            }
        }
        if (pages.length > 0) {
            groups.push({
                ...group,
                pages,
            })
        }
    }
    return groups
}

export type Page = string | { page: string; label: string }

export type Group = {
    name?: string
    pages: Page[]
    prevGroupNav?: boolean
    nextGroupNav?: boolean
}

export type PageNavInfo = {
    href: string
    label: string
    group?: string
    external?: boolean
}

export function getPageInfo(page: Page) {
    const id = typeof page === 'string' ? page : page.page
    if (id.match(/^\/.+/) || id.match(/^[a-z]+:\/\//)) {
        return {
            href: id,
            label: typeof page === 'string' ? id.replace(/^[a-z]+:\/\//, '') : page.label,
            external: !(
                id === import.meta.env.BASE_URL || id.startsWith(import.meta.env.BASE_URL + '/')
            ),
        }
    }
    const entry = entries.find((entry) => entry.id === id)
    if (entry) {
        return {
            href: getEntryHref(entry.id),
            label: typeof page === 'string' ? entry.data.title : page.label,
        }
    }
}

export function getEntryHref(id: string) {
    return getEntryPathname(id, import.meta.env.BASE_URL, buildConfig.format)
}

export function getPageGroup(page: Page) {
    const info = getPageInfo(page)
    if (!info) {
        return
    }
    return getGroups().find(({ pages }) => pages.find(({ href }) => href === info.href))?.name
}

export function getNextPage(href: string): PageNavInfo | undefined {
    const groups = getGroups()
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i]
        for (let j = 0; j < group.pages.length; j++) {
            if (group.pages[j].href === href) {
                if (j < group.pages.length - 1) {
                    return {
                        ...group.pages[j + 1],
                        group: group.name,
                    }
                } else if (i < groups.length - 1 && group.nextGroupNav !== false) {
                    const other = groups[i + 1]
                    return {
                        ...other.pages[0],
                        group: other.name,
                    }
                }
                return
            }
        }
    }
}

export function getPreviousPage(href: string): PageNavInfo | undefined {
    const groups = getGroups()
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i]
        for (let j = 0; j < group.pages.length; j++) {
            if (group.pages[j].href === href) {
                if (j > 0) {
                    return {
                        ...group.pages[j - 1],
                        group: group.name,
                    }
                } else if (i > 0 && group.prevGroupNav !== false) {
                    const other = groups[i - 1]
                    return {
                        ...other.pages[other.pages.length - 1],
                        group: other.name,
                    }
                }
                return
            }
        }
    }
}
