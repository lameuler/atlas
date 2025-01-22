import type { Element } from 'hast'
import { h } from 'hastscript'
import rehypeStringify from 'rehype-stringify'
import { codeToTokens } from 'shiki'
import {
    DeclarationReflection,
    ReflectionFlags,
    ReflectionKind,
    ReflectionSymbolId,
    SignatureReflection,
    type SomeType,
    Type,
    TypeContext,
    TypeParameterReflection,
    type TypeVisitor,
} from 'typedoc'
import { unified } from 'unified'

import { LinkResolver } from './model.js'

interface ExcerptOptions {
    space?: number | string | false
    indent?: number
}

type ExcerptPart = string | ExcerptReference

class ExcerptReference {
    constructor(
        public content: string,
        public id: number | ReflectionSymbolId,
    ) {}
    toString() {
        return this.content
    }
}

export class Excerpt {
    #content: string = ''
    #references: {
        start: number
        end: number
        ref: string | number | ReflectionSymbolId | undefined
    }[] = []
    #kind?: 'normal' | 'type' | 'member'

    private constructor(
        parts: (ExcerptPart | ExcerptPart[])[],
        kind?: 'normal' | 'type' | 'member',
    ) {
        for (const part of parts.flat()) {
            if (part instanceof ExcerptReference) {
                this.#references.push({
                    start: this.#content.length,
                    end: this.#content.length + part.content.length,
                    ref: part.id,
                })
            }
            this.#content += part
        }
        this.#kind = kind
    }

    get content() {
        return this.#content
    }
    get references() {
        const references: { start: number; end: number; href: string }[] = []
        for (const { start, end, ref } of this.#references) {
            if (typeof ref === 'string') {
                references.push({
                    start,
                    end,
                    href: ref,
                })
            }
        }
        return references
    }
    get kind() {
        return this.#kind
    }

    resolve(resolver: LinkResolver) {
        for (const reference of this.#references) {
            if (typeof reference.ref === 'number' || reference.ref instanceof ReflectionSymbolId) {
                reference.ref = resolver.resolve(reference.ref)
            }
        }
    }

    async render() {
        let prefixLine = ''
        let suffixLine = ''

        if (this.kind === 'type') {
            prefixLine = 'type __$Type = '
        } else if (this.kind === 'member') {
            prefixLine = 'class __$Class {'
            suffixLine = '}'
        }

        const source = prefixLine + '\n' + this.content + '\n' + suffixLine

        const shikiConfig = globalThis.atlasAstroMarkdownOptions?.shikiConfig
        // using tokens gives better types to work with
        const result =
            shikiConfig && Object.keys(shikiConfig?.themes).length > 0
                ? await codeToTokens(source, {
                      lang: 'ts',
                      themes: shikiConfig?.themes,
                      defaultColor: shikiConfig?.defaultColor,
                  })
                : await codeToTokens(source, {
                      lang: 'ts',
                      theme: shikiConfig?.theme ?? 'github-dark',
                      defaultColor: shikiConfig?.defaultColor,
                  })
        // TODO wrap and transformers options are not used

        let curr = 0
        const code = h('code', {})
        for (let i = 1; i < result.tokens.length - 1; i++) {
            const line = result.tokens[i]
            const nodes: Element[] = []
            for (const token of line) {
                if (!token.htmlStyle) {
                    token.htmlStyle = {}
                    if (token.color) {
                        token.htmlStyle['color'] = token.color
                    }
                    if (token.bgColor) {
                        token.htmlStyle['background-color'] = token.bgColor
                    }
                }
                const attr = { ...token.htmlAttrs, style: token.htmlStyle }
                const span = h('span', attr, token.content)
                const offset = token.offset - prefixLine.length - 1
                if (curr < this.references.length) {
                    const ref = this.references[curr]
                    if (offset + token.content.length >= ref.end) {
                        curr++
                    }
                    if (offset < ref.end && offset + token.content.length > ref.start) {
                        // the token overlaps with the ref
                        let a: Element | undefined = undefined
                        const start = Math.max(ref.start - offset, 0)
                        const end = Math.min(ref.end - offset, token.content.length)

                        if (start > 0) {
                            nodes.push(h('span', attr, token.content.substring(0, start)))
                        } else if (nodes.length > 0) {
                            const prev = nodes[nodes.length - 1]
                            if (prev.tagName === 'a' && prev.properties.href === ref.href) {
                                a = prev
                            }
                        }

                        if (!a) {
                            a = h('a', { href: ref.href })
                            nodes.push(a)
                        }
                        a.children.push(h('span', attr, token.content.substring(start, end)))

                        if (end < token.content.length) {
                            nodes.push(h('span', attr, token.content.substring(end)))
                        }

                        continue
                    }
                }
                nodes.push(span)
            }
            code.children.push(h('span.line', {}, ...nodes))
            if (i < result.tokens.length - 2) {
                code.children.push({ type: 'text', value: '\n' })
            }
        }

        if (!result.rootStyle) {
            result.rootStyle = ''
            if (result.fg) {
                result.rootStyle += `color:${result.fg};`
            }
            if (result.bg) {
                result.rootStyle += `background-color:${result.bg};`
            }
        }
        const themeName = result.themeName
            ? ' ' + result.themeName.replace('shiki-themes', 'astro-code-themes')
            : ''
        const root = h(
            null,
            h(
                'pre.astro-code',
                {
                    style: result.rootStyle,
                    class: 'astro-code' + themeName,
                    tabindex: 0,
                },
                code,
            ),
        )

        return unified().use(rehypeStringify).stringify(root)
    }

    static of(
        reflection: DeclarationReflection | SignatureReflection,
        options: ExcerptOptions = { space: 4 },
    ) {
        switch (reflection.kind) {
            case ReflectionKind.Class:
                return Excerpt.ofClass(reflection, options)
            case ReflectionKind.Interface:
                return Excerpt.ofInterface(reflection, options)
            case ReflectionKind.TypeAlias:
                return Excerpt.ofTypeAlias(reflection, options)
            case ReflectionKind.Variable:
                return Excerpt.ofVariable(reflection, options)
            case ReflectionKind.Property:
                return Excerpt.ofProperty(reflection, options)
        }
        if (reflection instanceof SignatureReflection) {
            switch (reflection.parent.kind) {
                case ReflectionKind.Function:
                    return Excerpt.ofFunction(reflection, options)
                case ReflectionKind.Method:
                case ReflectionKind.Accessor:
                case ReflectionKind.Constructor:
                    return Excerpt.ofMemberSignature(reflection, options)
                case ReflectionKind.Class:
                case ReflectionKind.Interface:
                    if (reflection.kind === ReflectionKind.CallSignature) {
                        return new Excerpt(
                            [indentPart(options), callSignatureParts(reflection, options, ': ')],
                            'member',
                        )
                    } else if (reflection.kind === ReflectionKind.IndexSignature) {
                        return new Excerpt(
                            [indentPart(options), indexSignatureParts(reflection, options)],
                            'member',
                        )
                    }
            }
            throw new Error(
                `unexpected signature kind ${ReflectionKind.singularString(reflection.kind)} in ${ReflectionKind.singularString(reflection.parent.kind)}`,
            )
        }
        throw new Error(
            `unexpected reflection kind ${ReflectionKind.singularString(reflection.kind)}`,
        )
    }

    static ofType(type: Type, options: ExcerptOptions = {}) {
        return new Excerpt(type.visit(typeVisitor, TypeContext.none, options), 'type')
    }

    static ofMemberSignature(signature: SignatureReflection, options: ExcerptOptions = {}) {
        return new Excerpt(
            [indentPart(options), memberSignatureParts(signature, options)],
            'member',
        )
    }

    static ofProperty(declaration: DeclarationReflection, options: ExcerptOptions = {}) {
        return new Excerpt([indentPart(options), propertyParts(declaration, options)], 'member')
    }

    static ofClass(declaration: DeclarationReflection, options: ExcerptOptions = {}) {
        const parts: ExcerptPart[] = [indentPart(options), 'export ']
        if (declaration.flags.isAbstract) {
            parts.push('abstract ')
        }
        if (declaration.name === 'default') {
            parts.push('default class ')
        } else {
            parts.push('class ', declaration.name)
        }
        parts.push(...typeParameterParts(declaration.typeParameters, options))
        if (parts[parts.length - 1].toString().endsWith(' ')) {
            parts.push(' ')
        }
        parts.push(...typeListParts(declaration.extendedTypes, options, 'extends'))
        parts.push(...typeListParts(declaration.implementedTypes, options, 'implements'))
        return new Excerpt(parts)
    }

    static ofInterface(declaration: DeclarationReflection, options: ExcerptOptions = {}) {
        const parts: ExcerptPart[] = [indentPart(options), 'export ']
        if (declaration.name === 'default') {
            parts.push('default interface ')
        } else {
            parts.push('interface ', declaration.name)
        }
        parts.push(...typeParameterParts(declaration.typeParameters, options))
        if (parts[parts.length - 1].toString().endsWith(' ')) {
            parts.push(' ')
        }
        parts.push(...typeListParts(declaration.extendedTypes, options, 'extends'))
        return new Excerpt(parts)
    }

    static ofTypeAlias(declaration: DeclarationReflection, options: ExcerptOptions = {}) {
        const parts: ExcerptPart[] = [indentPart(options), 'export ']
        if (declaration.name === 'default') {
            parts.push('default type')
        } else {
            parts.push('type ', declaration.name)
        }
        parts.push(' = ')
        if (declaration.type) {
            parts.push(...declaration.type.visit(typeVisitor, TypeContext.none, options))
        } else {
            parts.push('unknown')
        }
        return new Excerpt(parts)
    }

    static ofFunction(signature: SignatureReflection, options: ExcerptOptions = {}) {
        const parts: ExcerptPart[] = [indentPart(options), 'export ']
        if (signature.name === 'default') {
            parts.push('default function ')
        } else {
            parts.push('function ', signature.name)
        }
        parts.push(...callSignatureParts(signature, options, ': '))
        return new Excerpt(parts)
    }

    static ofVariable(declaration: DeclarationReflection, options: ExcerptOptions = {}) {
        const parts: ExcerptPart[] = [indentPart(options), 'export ']
        // TODO fix non-literal default
        if (declaration.name === 'default') {
            parts.push('default ')
        } else {
            if (declaration.flags.isConst) {
                parts.push('const ')
            } else {
                parts.push('let ')
            }
            parts.push(declaration.name)
            if (declaration.type?.type === 'literal' && declaration.type.value !== null) {
                parts.push(' = ')
            } else {
                parts.push(': ')
            }
        }
        if (declaration.type) {
            // if (declaration.type.type === 'literal' && declaration.type.value !== null) {
            //     parts.push(' = ')
            // } else {
            //     parts.push(': ')
            // }
            parts.push(...declaration.type.visit(typeVisitor, TypeContext.none, options))
        } else {
            parts.push('unknown')
        }
        return new Excerpt(parts)
    }
}

function resolveSpace(options: ExcerptOptions) {
    if (typeof options.space === 'string') {
        return options.space.replaceAll('\n', '').substring(0, 10)
    } else if (typeof options.space === 'number' && options.space >= 0) {
        return ' '.repeat(options.space)
    } else {
        return false
    }
}

function wrap(
    type: { needsParenthesis(context: TypeContext): boolean },
    context: TypeContext,
    parts: (ExcerptPart | ExcerptPart[])[],
) {
    return type.needsParenthesis(context) ? ['(', ...parts.flat(), ')'] : parts.flat()
}

const arrowFunctionType = {
    needsParenthesis(context: TypeContext): boolean {
        const map: Partial<Record<TypeContext, boolean>> = {
            arrayElement: true,
            conditionalCheck: true,
            indexedObject: true,
            intersectionElement: true,
            optionalElement: true,
            typeOperatorTarget: true,
            restElement: true,
            unionElement: true,
        }
        return map[context] ?? false
    },
}

const typeVisitor: TypeVisitor<ExcerptPart[], [TypeContext, ExcerptOptions]> = {
    array: function (type, context, options) {
        const parts = [type.elementType.visit(typeVisitor, TypeContext.arrayElement, options), '[]']
        return wrap(type, context, parts)
    },
    conditional: function (type, context, options) {
        const parts = [
            type.checkType.visit(typeVisitor, TypeContext.conditionalCheck, options),
            ' extends ',
            type.extendsType.visit(typeVisitor, TypeContext.conditionalExtends, options),
            ' ? ',
            type.trueType.visit(typeVisitor, TypeContext.conditionalTrue, options),
            ' : ',
            type.falseType.visit(typeVisitor, TypeContext.conditionalFalse, options),
        ]
        return wrap(type, context, parts)
    },
    indexedAccess: function (type, context, options) {
        const parts = [
            type.objectType.visit(typeVisitor, TypeContext.indexedObject, options),
            '[',
            type.indexType.visit(typeVisitor, TypeContext.indexedIndex, options),
            ']',
        ]
        return wrap(type, context, parts)
    },
    inferred: function (type, context, options) {
        const parts: ExcerptPart | ExcerptPart[] = ['infer ', type.name]
        if (type.constraint) {
            parts.push(
                ' extends ',
                ...type.constraint.visit(typeVisitor, TypeContext.inferredConstraint, options),
            )
        }
        return wrap(type, context, parts)
    },
    intersection: function (type, context, options) {
        const parts: (ExcerptPart | ExcerptPart[])[] = [
            type.types[0].visit(typeVisitor, TypeContext.intersectionElement, options),
        ]
        for (let i = 1; i < type.types.length; i++) {
            parts.push(
                ' & ',
                type.types[i].visit(typeVisitor, TypeContext.intersectionElement, options),
            )
        }
        return wrap(type, context, parts)
    },
    intrinsic: function (type, context) {
        return wrap(type, context, [type.name])
    },
    literal: function (type, context) {
        if (type.value === null) {
            return wrap(type, context, ['null'])
        }
        switch (typeof type.value) {
            case 'bigint':
                return wrap(type, context, [type.value.toString(), 'n'])
            case 'number':
            case 'boolean':
                return wrap(type, context, [type.value.toString()])
            case 'string':
                return wrap(type, context, [escapeString(type.value)])
            default:
                throw new Error(`unsupported literal ${type.value} (type ${typeof type.value}`)
        }
    },
    mapped: function (type, context, options) {
        const indented = { ...options, indent: Math.max(options.indent ?? 0, 0) + 1 }
        const space = resolveSpace(options)
        const parts: (ExcerptPart | ExcerptPart[])[] = [
            space ? '{\n' + space.repeat(indented.indent) : '{ ',
        ]
        if (type.readonlyModifier === '+') {
            parts.push('readonly ')
        } else if (type.readonlyModifier === '-') {
            parts.push('-readonly ')
        }
        parts.push(
            '[',
            type.parameter,
            ' in ',
            type.parameterType.visit(typeVisitor, TypeContext.mappedParameter, indented),
        )
        if (type.nameType) {
            parts.push(' as ', type.nameType.visit(typeVisitor, TypeContext.mappedName, indented))
        }
        parts.push(']')
        if (type.optionalModifier === '+') {
            parts.push('?')
        } else if (type.optionalModifier === '-') {
            parts.push('-?')
        }
        parts.push(
            ': ',
            type.templateType.visit(typeVisitor, TypeContext.mappedTemplate, indented),
            space ? '\n' + space.repeat(indented.indent - 1) + '}' : ' }',
        )
        return wrap(type, context, parts)
    },
    optional: function (type, context, options) {
        return wrap(type, context, [
            type.elementType.visit(typeVisitor, TypeContext.optionalElement, options),
            '?',
        ])
    },
    predicate: function (type, context, options) {
        const parts: (ExcerptPart | ExcerptPart[])[] = []
        if (type.asserts) {
            parts.push('asserts ')
        }
        parts.push(type.name)
        if (type.targetType) {
            parts.push(
                ' is ',
                type.targetType.visit(typeVisitor, TypeContext.predicateTarget, options),
            )
        }
        return wrap(type, context, parts)
    },
    query: function (type, context, options) {
        return wrap(type, context, [
            'typeof ',
            type.queryType.visit(typeVisitor, TypeContext.queryTypeTarget, options),
        ])
    },
    reference: function (type, context, options) {
        const parts: (ExcerptPart | ExcerptPart[])[] = []
        if (type.reflection) {
            if (!type.refersToTypeParameter) {
                parts.push(new ExcerptReference(type.reflection.name, type.reflection.id))
            } else {
                parts.push(type.reflection.name)
            }
        } else if (type.symbolId) {
            parts.push(new ExcerptReference(type.name, type.symbolId))
        } else {
            parts.push(type.name)
        }
        if (type.typeArguments && type.typeArguments.length > 0) {
            parts.push(
                '<',
                type.typeArguments[0].visit(
                    typeVisitor,
                    TypeContext.referenceTypeArgument,
                    options,
                ),
            )
            for (let i = 1; i < type.typeArguments.length; i++) {
                parts.push(
                    ', ',
                    type.typeArguments[i].visit(
                        typeVisitor,
                        TypeContext.referenceTypeArgument,
                        options,
                    ),
                )
            }
            parts.push('>')
        }
        return wrap(type, context, parts)
    },
    reflection: function (type, context, options) {
        const indented = { ...options, indent: Math.max(options.indent ?? 0, 0) + 1 }
        const space = resolveSpace(options)
        const parts: (ExcerptPart | ExcerptPart[])[] = [
            space ? '{\n' + space.repeat(indented.indent) : '{ ',
        ]
        const allSignatures = type.declaration.getAllSignatures()
        const callSignatures = allSignatures.filter(
            ({ kind }) => kind === ReflectionKind.CallSignature,
        )
        const constructorSignatures = allSignatures.filter(
            ({ kind }) => kind === ReflectionKind.ConstructorSignature,
        )
        const indexSignatures = allSignatures.filter(
            ({ kind }) => kind === ReflectionKind.IndexSignature,
        )
        const sep = space ? '\n' + space.repeat(indented.indent) : '; '
        for (const signature of constructorSignatures) {
            parts.push('new ', callSignatureParts(signature, indented, ': '), sep)
        }
        for (const signature of callSignatures) {
            parts.push(callSignatureParts(signature, indented, ': '), sep)
        }
        for (const signature of indexSignatures) {
            parts.push(indexSignatureParts(signature, indented), sep)
        }
        if (type.declaration.children && type.declaration.children.length > 0) {
            for (const child of type.declaration.children) {
                // parts.push('/* ', ReflectionKind.singularString(child.kind), ' ', child.escapedName+'', ' */', sep)
                if (child.kind === ReflectionKind.Property) {
                    parts.push(propertyParts(child, indented), sep)
                } else {
                    for (const signature of child.getNonIndexSignatures()) {
                        parts.push(memberSignatureParts(signature, indented), sep)
                    }
                }
            }
        } else if (allSignatures.length === 1 && callSignatures.length === 1) {
            // () => type; only if the only signature & member is a call signature
            return wrap(
                arrowFunctionType,
                context,
                callSignatureParts(callSignatures[0], options, ' => '),
            )
        } else if (parts.length === 1) {
            return wrap(type, context, ['{}'])
        }
        if (parts.length > 2) {
            parts.pop()
        }
        parts.push(space ? '\n' + space.repeat(indented.indent - 1) + '}' : ' }')
        return wrap(type, context, parts)
    },
    rest: function (type, context, options) {
        return wrap(type, context, [
            '...',
            type.elementType.visit(typeVisitor, TypeContext.restElement, options),
        ])
    },
    templateLiteral: function (type, context, options) {
        const parts: (ExcerptPart | ExcerptPart[])[] = [
            '`',
            type.head,
            type.tail
                .map(([t, text]) => [
                    '${',
                    t.visit(typeVisitor, TypeContext.templateLiteralElement, options),
                    '}',
                    text,
                ])
                .flat(2),
            '`',
        ]

        return wrap(type, context, parts)
    },
    tuple: function (type, context, options) {
        const parts: (ExcerptPart | ExcerptPart[])[] = ['[']
        if (type.elements.length > 0) {
            parts.push(type.elements[0].visit(typeVisitor, TypeContext.tupleElement, options))
            for (let i = 1; i < type.elements.length; i++) {
                parts.push(
                    ', ',
                    type.elements[i].visit(typeVisitor, TypeContext.tupleElement, options),
                )
            }
        }
        parts.push(']')
        return wrap(type, context, parts)
    },
    namedTupleMember: function (type, context, options) {
        const parts: (ExcerptPart | ExcerptPart[])[] = [type.name]
        if (type.isOptional) {
            parts.push('?')
        }
        parts.push(': ', type.element.visit(typeVisitor, TypeContext.tupleElement, options))
        return wrap(type, context, parts)
    },
    typeOperator: function (type, context, options) {
        return wrap(type, context, [
            type.operator,
            ' ',
            type.target.visit(typeVisitor, TypeContext.typeOperatorTarget, options),
        ])
    },
    union: function (type, context, options) {
        const parts: (ExcerptPart | ExcerptPart[])[] = [
            type.types[0].visit(typeVisitor, TypeContext.unionElement, options),
        ]
        for (let i = 1; i < type.types.length; i++) {
            parts.push(' | ', type.types[i].visit(typeVisitor, TypeContext.unionElement, options))
        }
        return wrap(type, context, parts)
    },
    unknown: function (type, context) {
        return wrap(type, context, [type.name])
    },
}

function escapeString(str: string) {
    return JSON.stringify(str)
}

function escapeMemberName(name: string, escapedName: string) {
    if (escapedName.startsWith('__')) {
        if (escapedName[2] === '_') {
            name = escapedName.substring(1)
        } else {
            return name
        }
    }
    // valid variable name
    // simple numbers: /^\d+(\.\d+)?/
    if (/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name)) {
        return name
    }
    // numbers can also be represented unescaped
    // but is potentially confusing since they are actually cast to string
    return escapeString(name)
}

function callSignatureParts(
    signature: SignatureReflection,
    options: ExcerptOptions,
    sep: string | false,
    typeParams = true,
) {
    const parts: (ExcerptPart | ExcerptPart[])[] = []

    if (typeParams) {
        parts.push(...typeParameterParts(signature.typeParameters, options))
    }
    parts.push('(')
    if (signature.parameters && signature.parameters.length > 0) {
        for (let i = 0; i < signature.parameters.length; i++) {
            const p = signature.parameters[i]
            parts.push(modifierFlagsParts(p.flags), p.name)
            if (p.flags.isOptional) {
                parts.push('?')
            }
            parts.push(': ')
            if (p.type) {
                parts.push(p.type.visit(typeVisitor, TypeContext.none, options))
            } else {
                parts.push('unknown')
            }
            if (p.defaultValue) {
                parts.push(' = ', p.defaultValue)
            }
            if (i < signature.parameters.length - 1) {
                parts.push(', ')
            }
        }
    }
    parts.push(')')
    if (sep) {
        parts.push(sep)
        if (signature.type) {
            parts.push(signature.type.visit(typeVisitor, TypeContext.none, options))
        } else {
            parts.push('unknown')
        }
    }
    return parts.flat()
}

function indexSignatureParts(signature: SignatureReflection, options: ExcerptOptions) {
    const parts: (ExcerptPart | ExcerptPart[])[] = []

    if (signature.parameters && signature.parameters.length === 1) {
        parts.push('[')
        const p = signature.parameters[0]
        parts.push(p.name, ': ')
        if (p.type) {
            parts.push(p.type.visit(typeVisitor, TypeContext.none, options))
        } else {
            parts.push('unknown')
        }
        parts.push(']: ')
        if (signature.type) {
            parts.push(signature.type.visit(typeVisitor, TypeContext.none, options))
        } else {
            parts.push('unknown')
        }
    }
    return parts.flat()
}

function typeParameterParts(types: TypeParameterReflection[] | undefined, options: ExcerptOptions) {
    const parts: ExcerptPart[] = []
    if (types && types.length > 0) {
        parts.push('<')
        for (let i = 0; i < types.length; i++) {
            const p = types[i]
            parts.push(p.name)
            if (p.type) {
                parts.push(
                    ' extends ',
                    ...p.type.visit(typeVisitor, TypeContext.referenceTypeArgument, options),
                )
            }
            if (p.default) {
                parts.push(
                    ' = ',
                    ...p.default.visit(typeVisitor, TypeContext.referenceTypeArgument, options),
                )
            }
            parts.push(', ')
        }
        parts.pop()
        parts.push('>')
    }
    return parts
}

function modifierFlagsParts(flags: ReflectionFlags) {
    const parts: ExcerptPart[] = []
    if (flags.isPublic) {
        parts.push('public ')
    } else if (flags.isProtected) {
        parts.push('protected ')
    } else if (flags.isPrivate) {
        parts.push('private ')
    }
    if (flags.isStatic) {
        parts.push('static ')
    } else if (flags.isAbstract) {
        parts.push('abstract ')
    }
    if (flags.isReadonly) {
        parts.push('readonly ')
    }
    if (flags.isRest) {
        parts.push('...')
    }
    return parts
}

function memberSignatureParts(signature: SignatureReflection, options: ExcerptOptions) {
    const parts: ExcerptPart[] = modifierFlagsParts(signature.parent.flags)
    const name = escapeMemberName(
        signature.parent.name,
        signature.parent.escapedName?.toString() ?? '',
    )
    let sigSep: string | boolean = ': '
    let typeParams = true
    if (signature.kind === ReflectionKind.ConstructorSignature) {
        if (signature.parent.parent?.kind === ReflectionKind.Class) {
            parts.push('constructor')
            typeParams = false
            sigSep = false
        } else {
            parts.push('new ')
        }
    } else {
        if (signature.kind === ReflectionKind.GetSignature) {
            parts.push('get ')
        } else if (signature.kind === ReflectionKind.SetSignature) {
            parts.push('set ')
            sigSep = false
        }
        parts.push(name)
    }
    parts.push(...callSignatureParts(signature, options, sigSep, typeParams))
    return parts
}

function propertyParts(declaration: DeclarationReflection, options: ExcerptOptions) {
    const parts: ExcerptPart[] = modifierFlagsParts(declaration.flags)
    parts.push(escapeMemberName(declaration.name, declaration.escapedName?.toString() ?? ''))
    if (declaration.flags.isOptional) {
        parts.push('?: ')
    } else {
        parts.push(': ')
    }
    if (declaration.type) {
        parts.push(...declaration.type.visit(typeVisitor, TypeContext.none, options))
    } else {
        parts.push('unknown')
    }
    return parts
}

function typeListParts(types: SomeType[] | undefined, options: ExcerptOptions, keyword: string) {
    const parts: ExcerptPart[] = []
    if (types && types.length > 0) {
        if (keyword) {
            parts.push(' ', keyword, ' ')
        }
        for (const type of types) {
            parts.push(...type.visit(typeVisitor, TypeContext.none, options), ', ')
        }
        parts.pop()
    }
    return parts
}

function indentPart(options: ExcerptOptions) {
    const space = resolveSpace(options)
    if (space) {
        return space.repeat(Math.max(options.indent ?? 0, 0))
    } else {
        return ''
    }
}
