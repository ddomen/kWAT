import * as Types from '../Types';
import type { IBuilder } from './index';
import type { ModuleBuilder } from './ModuleBuilder';

/** Allow to build a function import declaration with ease,
 * by preserving function import informations
*/
export class FunctionImporterBuilder implements IBuilder<Types.FunctionType> {
    /** @internal parameters of the imported function */
    private _parameters: Types.ResultType = [];
    /** @internal results of the imported function */
    private _results: Types.ResultType = [];
    /** @internal module owner of the imports */
    private _module: ModuleBuilder;

    /** The module owner of the function generation */
    public get module(): ModuleBuilder { return this._module; }
    /**Create a new void function import */
    public constructor(module: ModuleBuilder) { this._module = module; }

    /** Add one or more parameters to the function inputs 
     * @param {(Types.ValueType | Types.ValueTypeKey)} type type of the (first) parameter
     * @param {...(Types.ValueType | Types.ValueTypeKey)[]} [types] type of the (other) parameters
     * @return {this} the builder itself (chainable method)
     */
    public parameter(type: Types.ValueType | Types.ValueTypeKey, ...types: (Types.ValueType | Types.ValueTypeKey)[]): this {
        types.unshift(type);
        this._parameters.push(...types.map(t => {
            if (typeof(t) === 'string') { t = Types.Type[t] || t; }
            if (!Types.validValue(t)) { throw new Error('Invalid parameter Type: ' + t); }
            return t;
        }));
        return this;
    }
    /** Add one or more results to the function outputs.
     * *Note that multiple result output is not supported from the Wasm v1 standard.*
     * @param {(Types.ValueType | Types.ValueTypeKey)} type type of the (first) result
     * @param {...(Types.ValueType | Types.ValueTypeKey)[]} [types] type of the (other) results
     * @return {this} the builder itself (chainable method)
     */
    public result(type: Types.ValueType | Types.ValueTypeKey, ...types: (Types.ValueType | Types.ValueTypeKey)[]): this {
        types.unshift(type);
        this._results.push(...types.map(t => {
            if (typeof(t) === 'string') { t = Types.Type[t] || t; }
            if (!Types.validValue(t)) { throw new Error('Invalid result Type: ' + t); }
            return t;
        }));
        return this;
    }

    public build(): Types.FunctionType { return new Types.FunctionType(this._parameters, this._results); }
}