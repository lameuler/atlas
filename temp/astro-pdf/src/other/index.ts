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
