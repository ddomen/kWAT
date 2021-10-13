import * as Types from './Types';
import * as Sections from './Sections';
import * as Expression from './Expression';

type Exprimible<I extends Expression.Instruction=Expression.Instruction> = I | { instance: I };

export interface IBuilder<T> { build(): T; }
export type BuildingCallback<B extends IBuilder<any>> = (builder: B) => B;

export type FunctionDefinition = {
    segment: Sections.CodeSegment,
    export: Sections.ExportSegment | null
};
export class FunctionBuilder implements IBuilder<FunctionDefinition> {
    private _parameters: Types.ResultType;
    private _results: Types.ResultType;
    private _body: Expression.Instruction[];
    private _locals: { name: string, type: Types.ValueType}[];
    private _exported: string;

    public get exportName(): string | null { return this._exported || null; }
    public get isExported(): boolean { return !!this._exported; }

    public constructor() {
        this._parameters = [];
        this._results = [];
        this._body = [];
        this._locals = [];
        this._exported = '';
    }

    public exportAs(exported: string | null): this { this._exported = exported || ''; return this; }
    public removeExport(): this { this._exported = ''; return this; }

    public addParameter(type: Types.ValueType | Types.ValueTypeKey): this {
        if (typeof(type) === 'string') { type = Types.Type[type] || type; }
        if (!Types.validValue(type)) { throw new Error('Invalid parameter Type: ' + type); }
        this._parameters.push(type);
        return this;
    }
    public addResult(type: Types.ValueType | Types.ValueTypeKey): this {
        if (typeof(type) === 'string') { type = Types.Type[type] || type; }
        if (!Types.validValue(type)) { throw new Error('Invalid result Type: ' + type); }
        this._results.push(type);
        return this;
    }
    public addLocal(name: string, type: Types.ValueType | Types.ValueTypeKey): this {
        if (typeof(type) === 'string') { type = Types.Type[type] || type; }
        if (!Types.validValue(type)) { throw new Error('Invalid local Type: ' + type); }
        this._locals.push({ name, type });
        return this;
    }
    public addBodyExpression(expression: BuildingCallback<ExpressionBuilder>): this;
    public addBodyExpression(...expressions: Exprimible[]): this;
    public addBodyExpression(expression: BuildingCallback<ExpressionBuilder> | Exprimible, ...instructions: Exprimible[]): this {
        if (typeof(expression) === 'function') {
            let exp = expression(new ExpressionBuilder()).build();
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
        let type = new Types.FunctionType(this._parameters, this._results);
        return {
            export: this._exported ? new Sections.ExportSegment(
                this._exported,
                type
            ) : null,
            segment: new Sections.CodeSegment(
                type,
                this._body,
                this._locals.map(l => l.type)
            )
        };
    }
}

export class ExpressionBuilder implements IBuilder<Expression.Expression> {

    private _instructions: Expression.Instruction[];

    public constructor() { this._instructions = []; }

    public addInstruction(...instructions: Exprimible[]): this {
        instructions.forEach(i => {
            if (!(i instanceof Expression.Instruction)) {
                if ('instance' in i && i.instance instanceof Expression.Instruction) { i = i.instance; }
                else { throw new Error('Invalid body expression: ' + i); }
            }
            this._instructions.push(i);
        })
        return this;
    }

    public const(value: number, type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        if (typeof(type) === 'string') { type = Types.Type[type]; }
        switch (type) {
            case Types.Type.i32: return this.constI32(value);
            case Types.Type.i64: return this.const(value);
            case Types.Type.f32: return this.const(value);
            case Types.Type.f64: return this.const(value);
            default: throw new Error('Invalid const type');
        }
    }
    public constI32(value: number): this { this._instructions.push(new Expression.I32ConstInstruction(value)); return this; }
    public constI64(value: number): this { this._instructions.push(new Expression.I64ConstInstruction(value)); return this; }
    public constF32(value: number): this { this._instructions.push(new Expression.F32ConstInstruction(value)); return this; }
    public constF64(value: number): this { this._instructions.push(new Expression.F64ConstInstruction(value)); return this; }

    public return(): this {
        this._instructions.push(Expression.ReturnInstruction.instance);
        return this;
    }

    public build(): Expression.Expression {
        return new Expression.Expression(this._instructions);
    }
}