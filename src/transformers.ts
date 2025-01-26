import {
    transformerMetaHighlight,
    transformerMetaWordHighlight,
    transformerNotationDiff,
    transformerNotationErrorLevel,
    transformerNotationFocus,
    transformerNotationHighlight,
    transformerNotationWordHighlight,
    transformerRemoveLineBreak,
    transformerRemoveNotationEscape,
} from '@shikijs/transformers'
import { h } from 'hastscript'
import { ShikiTransformer } from 'shiki'

import { makeIcon } from './util.js'

const matchAlgorithm = 'v3'
export const common: ShikiTransformer[] = [
    transformerMetaHighlight(),
    transformerMetaWordHighlight(),
    transformerNotationDiff({ matchAlgorithm }),
    transformerNotationErrorLevel({ matchAlgorithm }),
    transformerNotationFocus({ matchAlgorithm }),
    transformerNotationHighlight({ matchAlgorithm }),
    transformerNotationWordHighlight({ matchAlgorithm }),
    transformerRemoveNotationEscape(),
    transformerRemoveLineBreak(),
]

const copyIcon = makeIcon([
    'M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z',
    'M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1',
])
export const copyButton: ShikiTransformer = {
    pre(node) {
        node.children.push(h('button', { dataCopyPrevious: '' }, copyIcon))
    },
    root(root) {
        return h(null, h('div', {}, ...root.children))
    },
}

export const codeAutolink: ShikiTransformer = {
    span(hast, line, col, lineElement, token) {
        const matches = token.content.matchAll(
            /\bhttps?:\/\/[a-zA-Z0-9.-]+(:\d+)?[\w./?#@%!$&+,;=]*/g,
        )
        const parts: [number, number][] = []
        for (const match of matches) {
            if (match[0].endsWith('.')) {
                parts.push([match.index, match.index + match[0].replace(/\.+$/, '').length])
            } else {
                parts.push([match.index, match.index + match[0].length])
            }
        }
        if (parts.length > 0) {
            hast.children = []
            let prev = 0
            for (const [start, end] of parts) {
                hast.children.push({
                    type: 'text',
                    value: token.content.substring(prev, start),
                })
                const href = token.content.substring(start, end)
                hast.children.push(h('a', { href }, href))
                prev = end
            }
            hast.children.push({
                type: 'text',
                value: token.content.substring(prev),
            })
        }
    },
}
