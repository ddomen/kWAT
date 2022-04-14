import { ExpressionBuilder } from './ExpressionBuilder';
import * as Types from '../Types'
import * as Expression from '../Instructions'
import type { ModuleBuilder } from './ModuleBuilder';
import type { BuildingCallback, IBuilder } from './index';

type Exprimible<I extends Expression.Instruction=Expression.Instruction> = I | { instance: I };

export type FunctionDefinition = {
    type: Types.FunctionType,
    body: Expression.Instruction[],
    locals: Record<string, Types.ValueType>,
    references: string[],
    exported: string,
    name: string 
};
export class FunctionBuilder implements IBuilder<FunctionDefinition> {
    private _parameters: Types.ResultType = [];
    private _results: Types.ResultType = [];
    private _body: Expression.Instruction[] = [];
    private _references: string[] = []
    private _locals: Record<string, Types.ValueType> = {};
    private _exported: string = '';
    private _name: string = '';
    private _module: ModuleBuilder;
    
    
    public get exportName(): string | null { return this._exported || null; }
    public get isExported(): boolean { return !!this._exported; }
    public get name(): string { return this._name; }
    public get module(): ModuleBuilder { return this._module; }

    public constructor(module: ModuleBuilder) { this._module = module; }

    public useName(name: string): this { this._name = name; return this; }
    public exportAs(exported: string | null): this { this._exported = exported || ''; return this; }
    public removeExport(): this { this._exported = ''; return this; }

    public parameter(type: Types.ValueType | Types.ValueTypeKey): this {
        if (typeof(type) === 'string') { type = Types.Type[type] || type; }
        if (!Types.validValue(type)) { throw new Error('Invalid parameter Type: ' + type); }
        this._parameters.push(type);
        return this;
    }
    public result(type: Types.ValueType | Types.ValueTypeKey): this {
        if (typeof(type) === 'string') { type = Types.Type[type] || type; }
        if (!Types.validValue(type)) { throw new Error('Invalid result Type: ' + type); }
        this._results.push(type);
        return this;
    }
    public local(name: string, type: Types.ValueType | Types.ValueTypeKey = Types.Type.i32): this {
        if (typeof(type) === 'string') { type = Types.Type[type] || type; }
        if (!Types.validValue(type)) { throw new Error('Invalid local Type: ' + type); }
        name = '' + name;
        if (name in this._locals) { throw new Error('Function Builder local variable \'' + name + '\' already defined')}
        this._locals[name] = type;
        return this;
    }
    public bodyExpression(expression: BuildingCallback<ExpressionBuilder>): this;
    public bodyExpression(...expressions: Exprimible[]): this;
    public bodyExpression(expression: BuildingCallback<ExpressionBuilder> | Exprimible, ...instructions: Exprimible[]): this {
        if (typeof(expression) === 'function') {
            let exp = expression(new ExpressionBuilder(this)).build();
            this.addInstruction(...exp.Instructions);
        }
        else { this.addInstruction(expression, ...instructions); }
        return this;
    }
    public addInstruction(...instructions: Exprimible[]): this {
        instructions.forEach(i => {
            if (!(i instanceof Expression.Instruction)) {
                if ('instance' in i && i.instance instanceof Expression.Instruction) { i = i.instance; }
                else { throw new Error('Invalid body expression: ' + i); }
            }
            this._body.push(i);
        })
        return this;
    }

    public build(): FunctionDefinition {
        return {
            type: new Types.FunctionType(this._parameters, this._results),
            body: this._body.slice(),
            locals: Object.assign({}, this._locals),
            references: this._references.slice(),
            exported: this._exported,
            name: this._name
        };
    }
}