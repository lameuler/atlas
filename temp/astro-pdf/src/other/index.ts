/**
 * > [!CAUTION]
 * > This is not a real module
 *
 * @packageDocumentation
 */

export type Other = string | false | unknown | undefined | Promise<void>

export default 'Other'

/**
 *
 */
export abstract class AbsCls {
    abstract name: string
    /**
     * indicates that this is a class
     * @deprecated Use {@link Cls.toString} instead
     *
     * > [!TIP]
     * > This can be easily replaced
     * > ```js
     * > // do this instead
     * > ```
     */
    isClass = true
    /** @experimental */
    experimentalProp = 0
    /**
     * Do something and return a message on success
     */
    do(): string
    /**
     * Do something and log on success
     * @param log Set to `true` to enable logging
     * @deprecated Get the message returned by {@link do | `do()`} and then log it.
     */
    do(log: true): void
    do(log?: boolean): string | void {
        if (log !== true) {
            return 'done!'
        }
    }
}
export interface Itf {
    toString(): string
}
export class Cls extends AbsCls implements Itf {
    name = 'Cls'
    toString() {
        return 'Cls {}'
    }
}

export class P<T> extends Promise<T> {}

/**
 * @interface
 */
export type OBJ = {
    name?: string
    /**
     * @interface
     */
    readonly extras?: {
        getNum(): number
        /**
         * Get a number
         * @param n seed to use
         */
        getNum(n: number): number
        num?: number | (() => number)
        getNum2: {
            (): number
            (n: number): number
        }
        /**
         *
         */
        optionalGetNum?: {
            (): number
            (n: number): number
        }
        x?: () => {
            /** the current time */
            time: number
            /** a nice name */
            name: string
        }
        /**
         * Even more extra options!!
         *
         *
         * @example
         * ```ts
         * {
         *     extras: {
         *         more: {
         *             thisOtherThing: 'this is super important'
         *         }
         *     }
         * }
         * ```
         * @interface
         */
        more: {
            /**
             * This other thing that you need to provide
             *
             * https://example.com
             *
             * {@link https://example.com example site}
             *
             * @remarks
             * Can basically be anything
             *
             */
            thisOtherThing: string
        }
        // (): string
        // new (): string
        // [a: number]: unknown
    }
}

const obj: OBJ = {
    extras: {
        more: {
            thisOtherThing: '',
        },
        getNum() {
            return 0
        },
        getNum2(n?: number) {
            return n || 0
        },
    },
}
void obj

export interface OBJExtras {
    getNum(): number
    getNum(n: number): number
    num?: number | (() => number)
    getNum2: {
        (): number
        /**
         * @returns the string representation
         */
        (n: number): string
    }
    optionalGetNum?: {
        (): number
        (n: number): number
    }
    (): string
    new (): string
    [a: number]: unknown
    /**
     * hey
     */
    id: { 
        [a: number]: string
    }
    /**
     * creates something(?)
     * @param n - your favourite number
     * @returns we're actually not sure, we've never tried...
     */
    alt: {
        new (n: number): unknown
        // new (n: string): [unknown]
    }
    a: {
        /**
         * hey
         * @returns wtf
         */
        b: {
            /**
             * hey there!!
             * @returns nothing much
             */
            new (): Promise<Promise<OBJ>>
        }
    }
    /**
     * @param x something important
     */
    fn(x: unknown): boolean
}
