/** Interface that exposes a build method */
export interface IBuilder<T> {
    /** Build the current object after
     * imposed the construction in a declarative way
     * @return {T} the built object
    */
    build(): T;
}
export type BuildingCallback<B extends IBuilder<any>> = (builder: Omit<B, 'build'>) => B;

export * from './ExpressionBuilder'
export * from './FunctionBuilder'
export * from './FunctionImporterBuilder'
export * from './ModuleBuilder'