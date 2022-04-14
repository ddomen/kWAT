export interface IBuilder<T> { build(): T; }
export type BuildingCallback<B extends IBuilder<any>> = (builder: Omit<B, 'build'>) => B;

export * from './ExpressionBuilder'
export * from './FunctionBuilder'
export * from './FunctionImporterBuilder'
export * from './ModuleBuilder'