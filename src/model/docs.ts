import { Comment, CommentDisplayPart, Reflection, ReflectionSymbolId } from 'typedoc'

import { processor } from './markdown.js'
import { LinkResolver } from './model.js'

class DocsReference {
    #text: string
    #ref?: string | number | ReflectionSymbolId

    constructor(text: string, ref?: string | number | ReflectionSymbolId) {
        this.#text = text
        this.#ref = ref
    }

    resolve(resolver: LinkResolver) {
        if (typeof this.#ref === 'number' || this.#ref instanceof ReflectionSymbolId) {
            this.#ref = resolver.resolve(this.#ref)
        }
    }
    toString() {
        if (typeof this.#ref === 'string') {
            return `[${escapeLinkText(this.#text)}](${this.#ref})`
        } else {
            return this.#text
        }
    }
}

export class DocsBlock {
    #parts: (string | DocsReference)[] = []

    constructor(
        parts: readonly CommentDisplayPart[],
        public heading?: { depth: number; text: string; slug?: string },
    ) {
        for (const part of parts) {
            switch (part.kind) {
                case 'text':
                case 'code':
                    this.#parts.push(part.text)
                    break
                case 'inline-tag': {
                    if (part.tag === '@link') {
                        const ref = part.target instanceof Reflection ? part.target.id : part.target
                        this.#parts.push(new DocsReference(part.text, ref))
                    }
                    break
                }
            }
        }
    }

    get content() {
        let result = ''
        for (const part of this.#parts) {
            result += part
        }
        return result
    }
    get isEmpty() {
        return this.#parts.length === 0
    }
    resolve(resolver: LinkResolver) {
        for (const part of this.#parts) {
            if (part instanceof DocsReference) {
                part.resolve(resolver)
            }
        }
    }
    async render() {
        return (await processor.process(this.content)).toString()
    }
}

export class Docs {
    readonly summary?: DocsBlock
    readonly remarks?: DocsBlock
    readonly params?: {
        name: string
        content: string
    }
    readonly typeParams?: {
        name: string
        content: string
    }
    readonly examples?: readonly DocsBlock[]

    // TODO params & type params
    // TODO default value, return value
    private constructor(options: {
        summary?: DocsBlock
        remarks?: DocsBlock
        examples?: DocsBlock[]
    }) {
        if (options.summary?.isEmpty === false) {
            this.summary = options.summary
        }
        if (options.remarks?.isEmpty === false) {
            this.remarks = options.remarks
        }
        if (options.examples && options.examples.length > 0) {
            this.examples = options.examples
        }
    }

    visitBlocks<T = unknown>(
        visitor: (block: DocsBlock, kind: 'summary' | 'remarks' | 'example') => T,
    ) {
        const results: T[] = []
        if (this.summary) {
            results.push(visitor(this.summary, 'summary'))
        }
        if (this.remarks) {
            results.push(visitor(this.remarks, 'remarks'))
        }
        for (const example of this.examples ?? []) {
            results.push(visitor(example, 'example'))
        }
        return results
    }
    resolve(resolver: LinkResolver) {
        this.visitBlocks((block) => block.resolve(resolver))
    }

    static of(comment: Comment | undefined, isChild: boolean): Docs {
        if (!comment) {
            return new Docs({})
        }
        const examples: DocsBlock[] = []
        const depth = isChild ? 5 : 3
        const suffix = isChild ? ':' : ''
        for (const tag of comment.getTags('@example')) {
            const example = new DocsBlock(tag.content)
            if (!example.isEmpty) {
                examples.push(example)
            }
        }
        if (examples.length === 1) {
            examples[0].heading = { depth, text: 'Example' + suffix }
        } else if (examples.length > 1) {
            for (let i = 0; i < examples.length; i++) {
                examples[i].heading = { depth, text: `Example ${i + 1}${suffix}` }
            }
        }
        return new Docs({
            summary: new DocsBlock(comment.getShortSummary(true)),
            remarks: new DocsBlock(
                comment.getTag('@remarks')?.content ?? [],
                isChild ? undefined : { depth: 2, text: 'Description' },
            ),
            examples,
        })
    }
}

function escapeLinkText(text: string): string {
    text = text.trim()
    let result = ''
    let prev = 0
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\\') {
            i++
            if (i === text.length) {
                result += text.substring(prev, i) + '\\'
                prev = i
            }
        } else if (text[i] === '[' || text[i] === ']') {
            result += text.substring(prev, i) + '\\' + text[i]
            prev = i + 1
        }
    }
    return result + text.substring(prev, text.length)
}
