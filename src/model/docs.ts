import {
    CommentDisplayPart,
    DeclarationReflection,
    Reflection,
    ReflectionKind,
    ReflectionSymbolId,
    SignatureReflection,
    makeRecursiveVisitor,
} from 'typedoc'

import { getInlineProcessor, getProcessor } from './markdown.js'
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

export interface DocsHeading {
    depth: number
    text: string
    slug?: string | boolean
    code?: boolean
}

export class DocsBlock {
    #parts: (string | DocsReference)[] = []

    constructor(
        parts: readonly CommentDisplayPart[],
        public heading?: DocsHeading,
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
        if (this.heading) {
            this.heading.slug ??= false
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
    async render(inline = false) {
        const processor = inline ? await getInlineProcessor() : await getProcessor()
        return (await processor.process(this.content)).toString()
    }
    copyContent(heading?: DocsHeading) {
        const block = new DocsBlock([], heading)
        block.#parts = [...this.#parts]
        return block
    }
}

interface DocsOptions {
    readonly warning?: DocsBlock
    readonly shortSummary?: DocsBlock
    readonly summary?: DocsBlock
    readonly params?: {
        readonly head?: DocsBlock
        readonly members: readonly DocsBlock[]
    }
    readonly typeParams?: {
        readonly head?: DocsBlock
        readonly members: readonly DocsBlock[]
    }
    readonly defaultValue?: DocsBlock
    readonly returnValue?: DocsBlock
    readonly remarks?: DocsBlock
    readonly examples?: readonly DocsBlock[]
}

export class Docs implements DocsOptions {
    readonly warning
    readonly shortSummary
    readonly summary
    readonly remarks
    readonly defaultValue
    readonly returnValue
    readonly params
    readonly typeParams
    readonly examples

    private constructor(options: DocsOptions) {
        if (options.warning?.heading?.text) {
            this.warning = options.warning
        }
        if (options.shortSummary?.isEmpty === false) {
            this.shortSummary = options.shortSummary
        }
        if (options.summary?.isEmpty === false) {
            this.summary = options.summary
        }
        if (options.typeParams && options.typeParams.members.length > 0) {
            this.typeParams = options.typeParams
        }
        if (options.params && options.params.members.length > 0) {
            this.params = options.params
        }
        if (options.defaultValue?.isEmpty === false) {
            this.defaultValue = options.defaultValue
        }
        if (options.returnValue?.isEmpty === false) {
            this.returnValue = options.returnValue
        }
        if (options.remarks?.isEmpty === false) {
            this.remarks = options.remarks
        }
        if (options.examples && options.examples.length > 0) {
            this.examples = options.examples
        }
    }

    visitBlocks<T = unknown>(visitor: (block: DocsBlock, kind: keyof DocsOptions) => T) {
        const results: T[] = []
        if (this.warning) {
            results.push(visitor(this.warning, 'warning'))
        }
        if (this.shortSummary) {
            results.push(visitor(this.shortSummary, 'shortSummary'))
        }
        if (this.summary) {
            results.push(visitor(this.summary, 'summary'))
        }
        if (this.typeParams?.head) {
            results.push(visitor(this.typeParams.head, 'typeParams'))
        }
        for (const typeParam of this.typeParams?.members ?? []) {
            results.push(visitor(typeParam, 'typeParams'))
        }
        if (this.params?.head) {
            results.push(visitor(this.params.head, 'params'))
        }
        for (const param of this.params?.members ?? []) {
            results.push(visitor(param, 'params'))
        }
        if (this.defaultValue) {
            results.push(visitor(this.defaultValue, 'defaultValue'))
        }
        if (this.returnValue) {
            results.push(visitor(this.returnValue, 'returnValue'))
        }
        if (this.remarks) {
            results.push(visitor(this.remarks, 'remarks'))
        }
        for (const example of this.examples ?? []) {
            results.push(visitor(example, 'examples'))
        }
        return results
    }
    resolve(resolver: LinkResolver) {
        this.visitBlocks((block) => block.resolve(resolver))
    }

    static of(reflection: DeclarationReflection | SignatureReflection, isChild: boolean): Docs {
        const comment = reflection.comment
        if (!comment) {
            return new Docs({})
        }
        let warning: DocsBlock | undefined = undefined
        if (
            comment.hasModifier('@alpha') ||
            comment.hasModifier('@beta') ||
            comment.hasModifier('@experimental')
        ) {
            const kind =
                reflection instanceof SignatureReflection ? reflection.parent.kind : reflection.kind
            warning = new DocsBlock(
                [
                    {
                        kind: 'text',
                        text:
                            'This ' +
                            ReflectionKind.singularString(kind).toLowerCase() +
                            ' is experimental and may change or be removed in future versions.',
                    },
                ],
                { depth: 5, text: 'Experimental' },
            )
        }
        const deprecated = comment.getTag('@deprecated')
        if (deprecated) {
            warning = new DocsBlock(deprecated.content, { depth: 5, text: 'Deprecated' })
        }
        const typeParams: DocsBlock[] = []
        for (const tag of comment.getTags('@typeParam')) {
            if (tag.name) {
                typeParams.push(
                    new DocsBlock(tag.content, { depth: 5, text: tag.name, code: true }),
                )
            }
        }
        for (const typeParam of reflection.typeParameters ?? []) {
            typeParams.push(
                new DocsBlock(typeParam.comment?.summary ?? [], {
                    depth: 5,
                    text: typeParam.name,
                    code: true,
                }),
            )
        }

        const params: DocsBlock[] = []
        for (const tag of comment.getTags('@param')) {
            if (tag.name) {
                params.push(new DocsBlock(tag.content, { depth: 5, text: tag.name, code: true }))
            }
        }
        let returnValue: DocsBlock = new DocsBlock(comment?.getTag('@returns')?.content ?? [], {
            depth: 5,
            text: 'Returns:',
        })
        if (reflection instanceof SignatureReflection) {
            for (const param of reflection.parameters ?? []) {
                params.push(
                    new DocsBlock(param.comment?.summary ?? [], {
                        depth: 5,
                        text: param.name,
                        code: true,
                    }),
                )
            }
        } else if (reflection.type) {
            reflection.type.visit(
                makeRecursiveVisitor({
                    reflection(type) {
                        if (type.declaration.getAllSignatures().length !== 1) return

                        for (const signature of type.declaration.getAllSignatures()) {
                            for (const typeParam of signature.typeParameters ?? []) {
                                typeParams.push(
                                    new DocsBlock(typeParam.comment?.summary ?? [], {
                                        depth: 5,
                                        text: typeParam.name,
                                        code: true,
                                    }),
                                )
                            }
                            for (const param of signature.parameters ?? []) {
                                params.push(
                                    new DocsBlock(param.comment?.summary ?? [], {
                                        depth: 5,
                                        text: param.name,
                                        code: true,
                                    }),
                                )
                            }
                            if (signature.comment && returnValue.isEmpty) {
                                returnValue = new DocsBlock(
                                    signature.comment.getTag('@returns')?.content ?? [],
                                    { depth: 5, text: 'Returns:' },
                                )
                            }
                        }
                    },
                }),
            )
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
            examples[0].heading = { depth, text: 'Example' + suffix, slug: !isChild }
        } else if (examples.length > 1) {
            for (let i = 0; i < examples.length; i++) {
                examples[i].heading = { depth, text: `Example ${i + 1}${suffix}`, slug: !isChild }
            }
        }
        return new Docs({
            warning,
            shortSummary: new DocsBlock(comment.getShortSummary(true)),
            summary: new DocsBlock(comment.summary),
            typeParams: {
                head: new DocsBlock([], { depth: 5, text: 'Type Parameters' }),
                members: typeParams.filter((block) => !block.isEmpty),
            },
            params: {
                head: new DocsBlock([], { depth: 5, text: 'Parameters' }),
                members: params.filter((block) => !block.isEmpty),
            },
            defaultValue: new DocsBlock(comment.getTag('@defaultValue')?.content ?? [], {
                depth: 5,
                text: 'Default:',
            }),
            returnValue,
            remarks: new DocsBlock(
                comment.getTag('@remarks')?.content ?? [],
                isChild ? undefined : { depth: 2, text: 'Description', slug: true },
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
