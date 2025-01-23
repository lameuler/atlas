import { resolve } from 'node:path'

import Slugger, { slug } from 'github-slugger'
import {
    Application,
    DeclarationReflection,
    ReflectionKind,
    ReflectionSymbolId,
    ReflectionSymbolIdString,
    SignatureReflection,
    SourceReference,
} from 'typedoc'

import { Docs, DocsBlock } from './docs.js'
import { Excerpt } from './excerpts.js'

export interface EntryPoint extends Named {
    kind: 'entry'
    exports: Named[]
}

export interface Named {
    name: string
    id?: number
    parent?: Named
    heading: {
        depth: number
        slug?: string | false
        text?: string
        code?: boolean
    }
    kind: 'member' | 'export' | 'entry'
    declarations: (Declaration | ContainerDeclaration)[]
    headings: {
        depth: number
        slug: string
        text: string
    }[]
}

export type DeclarationKind =
    | 'Entry'
    | 'Class'
    | 'Interface'
    | 'Type'
    | 'Function'
    | 'Variable'
    | 'Property'
    | 'Accessor'
    | 'Method'
    | 'Constructor'
    | 'Index'
    | 'Call'

function getDeclarationKind(refKind: ReflectionKind): DeclarationKind | undefined {
    const map: Partial<Record<ReflectionKind, DeclarationKind>> = {
        [ReflectionKind.Accessor]: 'Accessor',
        [ReflectionKind.Class]: 'Class',
        // [ReflectionKind.Constructor]: 'Constructor',
        [ReflectionKind.Function]: 'Function',
        [ReflectionKind.Interface]: 'Interface',
        [ReflectionKind.Method]: 'Method',
        [ReflectionKind.Property]: 'Property',
        [ReflectionKind.TypeAlias]: 'Type',
        [ReflectionKind.Variable]: 'Variable',
    }
    // TODO different kind for get and set (to do Get/Getter Signature: Set/Setter Signature:)
    return map[refKind]
}

export interface Declaration {
    parent: Named
    id?: number
    heading: {
        depth: number
        slug?: string | false
        text: string // eg Signature / Class Signature / Function Signature
    }
    kind: Omit<DeclarationKind, 'Class' | 'Interface'>
    excerpt: Excerpt
    docs: Docs
    source: SourceReference | undefined
}

export interface ContainerDeclaration extends Declaration {
    kind: 'Class' | 'Interface'
    members: NamedList
    staticMembers: NamedList
    constructors?: Named
    indexSignatures?: Named
    callSignatures?: Named
}

export class NamedList extends Array<Named> {
    constructor(public heading: { depth: number; slug?: string | false; text: string }) {
        super()
    }
}

export function isContainer(declaration: Declaration): declaration is ContainerDeclaration {
    return declaration.kind === 'Class' || declaration.kind === 'Interface'
}

class NamedMap {
    private map = new Map<string | symbol, Named>()

    constructor(
        private kind: Named['kind'],
        private parent: Named,
    ) {}

    get(name: string, id: number): Named {
        const named = this.map.get(name)
        if (named) {
            return named
        } else {
            const named: Named = {
                name: name,
                id: id,
                parent: this.parent,
                kind: this.kind,
                declarations: [],
                heading:
                    this.kind === 'member'
                        ? {
                              depth: 3,
                              code: true,
                          }
                        : { depth: 1 },
                headings: [],
            }
            this.map.set(name, named)
            return named
        }
    }
    // TODO allow expanding the type of a property if it is a reference type
    addDeclaration(ref: DeclarationReflection | SignatureReflection, isChild = true) {
        const decRef = ref instanceof SignatureReflection ? ref.parent : ref
        const kind = getDeclarationKind(decRef.kind)
        if (!kind) return
        const named = this.get(ref.name, decRef.id)
        const declaration: Declaration = {
            parent: named,
            id: ref.id,
            heading: isChild
                ? { depth: 5, slug: false, text: 'Signature:' }
                : { depth: 2, text: 'Signature' },
            kind,
            excerpt: Excerpt.of(ref),
            docs: Docs.of(ref, named.kind === 'member'),
            source: ref.sources?.[0],
        }
        if (ref.isDeclaration() && (kind === 'Class' || kind === 'Interface')) {
            const members = new NamedMap('member', named)
            const staticMembers = new NamedMap('member', named)
            const constructors: Named = {
                name: 'Constructors',
                parent: named,
                kind: 'member',
                heading: { depth: 3 },
                headings: [],
                declarations: [],
            }
            for (const child of ref.children ?? []) {
                const signatures = child.getNonIndexSignatures()
                if (signatures.length > 0) {
                    for (const signature of signatures) {
                        if (child.kind === ReflectionKind.Constructor) {
                            constructors.declarations.push({
                                parent: constructors,
                                id: signature.id,
                                heading: { depth: 5, slug: false, text: 'Signature:' },
                                kind: 'Constructor',
                                excerpt: Excerpt.of(signature),
                                docs: Docs.of(signature, true),
                                source: signature.sources?.[0],
                            })
                        } else if (child.flags.isStatic) {
                            staticMembers.addDeclaration(signature)
                        } else {
                            members.addDeclaration(signature)
                        }
                    }
                } else if (child.flags.isStatic) {
                    staticMembers.addDeclaration(child)
                } else {
                    members.addDeclaration(child)
                }
            }
            const indexSignatures = getSignatureDeclarations(
                named,
                ref.indexSignatures,
                ref.id,
                'Index Signatures',
                'Index',
            )
            const callSignatures = getSignatureDeclarations(
                named,
                ref.signatures,
                ref.id,
                'Call Signatures',
                'Call',
            )
            const container: ContainerDeclaration = {
                ...declaration,
                kind,
                members: members.getAll({ depth: 2, text: 'Members' }),
                staticMembers: staticMembers.getAll({ depth: 2, text: 'Static Members' }),
                indexSignatures,
                callSignatures,
                constructors: constructors.declarations.length > 0 ? constructors : undefined,
            }
            named.declarations.push(container)
            return container
        } else {
            named.declarations.push(declaration)
            return declaration
        }
    }
    getAll(heading: { depth: number; slug?: string | false; text: string }) {
        const all = new NamedList(heading)
        this.map.forEach((named) => {
            if (named.declarations.length > 0) {
                all.push(named)
            }
        })
        return all
    }
}

function getSignatureDeclarations(
    parent: Named,
    signatures: SignatureReflection[] | undefined,
    id: number,
    name: string,
    kind: Omit<DeclarationKind, 'Class' | 'Interface'>,
): Named | undefined {
    if (signatures && signatures.length > 0) {
        const declarations: Declaration[] = signatures.map((signature) => ({
            parent,
            id: signature.id,
            heading: { depth: 5, slug: false, text: 'Signature:' },
            kind,
            excerpt: Excerpt.of(signature),
            docs: Docs.of(signature, true),
            source: signature.sources?.[0],
        }))
        return {
            name,
            parent,
            id,
            kind: 'member',
            declarations,
            heading: {
                depth: 3,
            },
            headings: [],
        }
    }
}

class FileNameSlugger {
    private map = new Map<string, number>()

    slug(filename: string) {
        const slugged = filename
            .split('/')
            .filter((part) => part.length > 0)
            .map((part) => slug(part))
            .join('/')
        let i = this.map.get(slugged) ?? 0
        while (true) {
            const result = i > 0 ? slugged + '-' + i : slugged
            if (!this.map.has(result)) {
                this.map.set(slugged, i + 1)
                return result
            }
            i++
        }
    }
}

class EntryBuilder {
    private entry: EntryPoint
    private exports: NamedMap
    private built = false

    constructor(
        private name: string,
        id: string,
        private slugger: FileNameSlugger,
    ) {
        this.entry = {
            name: this.name,
            heading: { depth: 1, slug: id },
            kind: 'entry',
            exports: [],
            declarations: [],
            headings: [],
        }
        this.exports = new NamedMap('export', this.entry)
    }

    addDeclaration(ref: DeclarationReflection | SignatureReflection) {
        const declaration = this.exports.addDeclaration(ref, false)
        return declaration
    }

    build(): EntryPoint {
        if (this.built) {
            return this.entry
        }
        this.exports
            .getAll({
                depth: 2,
                text: 'Exports',
            })
            .forEach((named) => {
                named.heading.slug = this.slugger.slug(this.entry.heading.slug + '/' + named.name)
                const firstKind = named.declarations[0].kind
                for (const { kind } of named.declarations.slice(1)) {
                    if (kind !== firstKind) {
                        for (const declaration of named.declarations) {
                            declaration.heading.text = declaration.kind + ' Signature'
                        }
                        break
                    }
                }
                if (named.name === 'default') {
                    this.entry.declarations = named.declarations
                    for (const declaration of named.declarations) {
                        declaration.parent = this.entry
                    }
                } else {
                    setAllHeadings(named)
                    this.entry.exports.push(named)
                }
            })
        setAllHeadings(this.entry)

        this.built = true
        return this.entry
    }
}

function setAllHeadings(named: Named) {
    named.headings = []
    const headingSlugger = new Slugger()
    for (const dec of named.declarations) {
        addHeading(named, dec, headingSlugger)
        if (isContainer(dec)) {
            addHeading(named, dec.constructors, headingSlugger)
            addHeading(named, dec.callSignatures, headingSlugger)
            addHeading(named, dec.indexSignatures, headingSlugger)
        }
        dec.docs?.visitBlocks((block) => addHeading(named, block, headingSlugger))
        if (isContainer(dec)) {
            addHeading(named, dec.staticMembers, headingSlugger)
            for (const member of dec.staticMembers) {
                addHeading(named, member, headingSlugger)
            }
            addHeading(named, dec.members, headingSlugger)
            for (const member of dec.members) {
                addHeading(named, member, headingSlugger)
            }
        }
    }
}

function addHeading(
    parent: Named,
    child: Named | NamedList | Declaration | DocsBlock | undefined,
    slugger: Slugger,
) {
    if (!child?.heading) return
    if (child instanceof NamedList && child.length === 0) return

    const heading = child.heading
    if ('name' in child) {
        heading.text ??= child.name
    } else {
        heading.text = child.heading.text
    }
    if (heading.slug !== false) {
        heading.slug ??= slugger.slug(heading.text)
        parent.headings.push({
            depth: heading.depth,
            slug: heading.slug,
            text: heading.text,
        })
    }
}

export class LinkResolver {
    private namedMap = new Map<number, Named>()
    private resolvedMap = new Map<number | ReflectionSymbolIdString, string | undefined>()

    constructor(
        private entries: EntryPoint[],
        private buildFormat: 'file' | 'preserve' | 'directory',
        private base: string,
        private resolveExternal?: (id: ReflectionSymbolId) => string | undefined,
    ) {
        for (const entry of this.entries) {
            this.add(entry)
            for (const exported of entry.exports) {
                this.add(exported)
            }
        }
    }

    private add(named: Named | undefined) {
        if (named === undefined) return

        if (typeof named.id === 'number') {
            this.namedMap.set(named.id, named)
        }
        this.addDeclarations(named.declarations)
    }
    private addDeclarations(declarations: Declaration[]) {
        for (const declaration of declarations) {
            if (declaration.id !== undefined) {
                this.namedMap.set(declaration.id, declaration.parent)
            }
            if (isContainer(declaration)) {
                this.add(declaration.constructors)
                this.add(declaration.callSignatures)
                this.add(declaration.indexSignatures)
                for (const member of declaration.staticMembers.concat(declaration.members)) {
                    this.add(member)
                }
            }
        }
    }

    resolve(id: number | ReflectionSymbolId): string | undefined {
        const key = typeof id === 'number' ? id : id.getStableKey()
        if (this.resolvedMap.has(key)) {
            return this.resolvedMap.get(key)
        }
        let resolved: string | undefined = undefined
        if (typeof id === 'number') {
            const named = this.namedMap.get(id)
            if (!named) {
                return undefined
            } else if (named.kind === 'member') {
                if (named.heading.slug && named.parent?.heading.slug) {
                    resolved =
                        this.resolveHref(named.parent?.heading.slug) + '#' + named.heading.slug
                }
            } else {
                resolved = this.resolveHref(named.heading.slug)
            }
        } else if (typeof this.resolveExternal === 'function') {
            resolved = this.resolveExternal(id)
        }
        this.resolvedMap.set(key, resolved)
        return resolved
    }

    resolveAll() {
        for (const entry of this.entries) {
            // TODO entry docs
            // entry.docs = resolveDocs
            // entry.reflection = undefined
            this.resolveDeclarations(entry.declarations)
            for (const exported of entry.exports) {
                this.resolveDeclarations(exported.declarations)
            }
        }
    }

    private resolveDeclarations(declarations: Declaration[] = []) {
        for (const declaration of declarations) {
            declaration.excerpt.resolve(this)
            declaration.docs.resolve(this)
            if (isContainer(declaration)) {
                this.resolveDeclarations(declaration.constructors?.declarations)
                this.resolveDeclarations(declaration.callSignatures?.declarations)
                this.resolveDeclarations(declaration.indexSignatures?.declarations)
                for (const member of declaration.staticMembers.concat(declaration.members)) {
                    this.resolveDeclarations(member?.declarations)
                }
            }
        }
    }

    private resolveHref(href: string | false | undefined) {
        if (typeof href !== 'string') {
            return undefined
        }
        if (this.buildFormat === 'directory' && !href.endsWith('/')) {
            href += '/'
        }
        if (this.buildFormat === 'file') {
            href = href.replace(/\/+$/, '')
        }
        return this.base.replace(/\/+$/, '') + '/' + href.replace(/^\/+/, '')
    }
}

export async function getExports(
    entryPoints: { file: string; id?: string }[],
    tsconfig?: string,
    format: 'directory' | 'preserve' | 'file' = 'directory',
    base = '/',
    resolveLink?: (id: ReflectionSymbolId) => string | undefined,
) {
    const app = await Application.bootstrap({
        entryPoints: entryPoints.map(({ file }) => file),
        tsconfig,
        sort: ['static-first', 'required-first', 'enum-value-ascending', 'source-order'],
        version: true,
        includeVersion: true,
        readme: 'none',
        alwaysCreateEntryPointModule: true,
        treatValidationWarningsAsErrors: true,
    })

    const project = await app.convert()

    if (!project) {
        throw new Error('unable to load project')
    }
    if (!project.children) {
        throw new Error(`project ${project.name} has no children`)
    }
    if (project.packageName === undefined) {
        throw new Error('failed to load package name')
    }
    if (project.packageVersion === undefined) {
        throw new Error('failed to load package version')
    }
    app.validate(project)
    if (app.logger.hasWarnings() || app.logger.hasErrors()) {
        throw new Error(
            `load/validation failed with ${app.logger.warningCount} warning(s) and ${app.logger.errorCount} error(s)`,
        )
    }

    const slugger = new FileNameSlugger()

    const modules: { path: string; fullName: string; id: string; module: DeclarationReflection }[] =
        []

    for (const module of project.children) {
        if (module.kind !== ReflectionKind.Module) {
            console.log(module.name, 'is not a module')
            continue
        }

        const name = module.name.replace(/^\/+/, '').replace(/\/+$/, '')
        const fullName = project.packageName + (name === 'index' ? '' : '/' + name)

        const sources = module.sources ?? []
        if (sources.length !== 1) {
            throw new Error(
                `expected module ${fullName} to have 1 source file, found ${sources.length}.`,
            )
        }
        const path = sources[0].fullFileName

        const options = entryPoints.find(({ file }) => resolve(file) === resolve(path))
        const id = options?.id ?? slugger.slug(name === 'index' ? '' : name)

        modules.push({ path, module, fullName, id })
    }

    const entries: EntryPoint[] = []

    for (const { module, fullName, id } of modules) {
        const entryBuilder = new EntryBuilder(fullName, id, slugger)

        if (!module.children) {
            throw new Error(`module ${fullName} has no children`)
        }
        for (const member of module.children) {
            switch (member.kind) {
                case ReflectionKind.Interface:
                case ReflectionKind.Class:
                case ReflectionKind.TypeAlias:
                case ReflectionKind.Variable: {
                    entryBuilder.addDeclaration(member)
                    break
                }
                case ReflectionKind.Function: {
                    for (const sig of member.signatures ?? []) {
                        entryBuilder.addDeclaration(sig)
                    }
                    break
                }
            }
        }

        entries.push(entryBuilder.build())
    }

    const resolver = new LinkResolver(entries, format, base, resolveLink)

    resolver.resolveAll()

    const files = new Set<string>()

    for (const named of entries.map((entry) => [entry, ...entry.exports]).flat()) {
        for (const declaration of named.declarations) {
            if (declaration.source) {
                files.add(declaration.source.fullFileName)
            }
        }
    }

    return { entries, files: [...files.values()] }
}
