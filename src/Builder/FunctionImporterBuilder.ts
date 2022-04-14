import * as Types from '../Types';
import type { IBuilder } from './index';
import type { ModuleBuilder } from './ModuleBuilder';

export class FunctionImporterBuilder implements IBuilder<Types.FunctionType> {
    private _parameters: Types.ResultType = [];
    private _results: Types.ResultType = [];
    private _module: ModuleBuilder;
    public get module(): ModuleBuilder { return this._module; }
    public constructor(module: ModuleBuilder) { this._module = module; }

    public parameter(type: Types.ValueType | Types.ValueTypeKey, ...types: (Types.ValueType | Types.ValueTypeKey)[]): this {
        types.unshift(type);
        this._parameters.push(...types.map(t => {
            if (typeof(t) === 'string') { t = Types.Type[t] || t; }
            if (!Types.validValue(t)) { throw new Error('Invalid parameter Type: ' + t); }
            return t;
        }));
        return this;
    }
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