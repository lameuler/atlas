/**
 * > [!CAUTION]
 * > This is not a real module
 *
 * @packageDocumentation
 */

export type Other = string | false

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
