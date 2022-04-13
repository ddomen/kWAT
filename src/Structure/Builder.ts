import * as Types from './Types';
import * as Sections from './Sections';
import * as Expression from './Expression';
import { Module } from './Module';

type Exprimible<I extends Expression.Instruction=Expression.Instruction> = I | { instance: I };

export interface IBuilder<T> { build(): T; }
export type BuildingCallback<B extends IBuilder<any>> = (builder: Omit<B, 'build'>) => B;

export class ModuleBuilder implements IBuilder<Module> {
    private _version: number = 1;
    private _functions: { [key: string]: FunctionDefinition } = {};
    private _imports: { [key: string]: Sections.ImportDescription } = {};
    private _memories: { [key: string]: Types.MemoryType } = {};
    private _data: { [key: number]: ArrayBuffer } = {};
    private _globals: { [key: string]: Sections.GlobalVariable } = {};
    private _starter: string | null = null;
    private _sourcemap: string | null = null;

    public get CurrentVersion(): number { return this._version; }
    
    public version(version: number): this { this._version = Math.max(1, Number(version) || 0); return this; }

    private randomName(target: { [key: string]: any }): string {
        let name: string;
        do { name = Math.random().toString(16).slice(3); }
        while (name in target);
        return name;
    }

    public importMemory(module: string, name: string): Sections.ImportDescription | null;
    public importMemory(module: string, name: string, min: number, max?: number): this;
    public importMemory(module: string, name: string, min?: number, max?: number): this | Sections.ImportDescription | null {
        const mn = module + '.' + name;
        if (typeof(min) !== 'number') {
            return this._imports[mn] instanceof Types.LimitType ?
                    this._imports[mn]! as Types.MemoryType :
                    null;
        }
        this._imports[mn] = new Types.LimitType(min, max);
        return this;
    }

    public memory(localName: string): Types.MemoryType | null;
    public memory(min: number, localName?: string): this;
    public memory(min: number, max: number, localName?: string): this;
    public memory(...args: any[]): this | Types.MemoryType | null {
        let a = args[0], b = args[1], localName = args[2];
        if (typeof(a) === 'string') { return this._memories[a] || null; }
        a = Number(a) || 0;
        if (typeof(b) === 'string') { localName = b; b = undefined; }
        b = typeof(b) !== 'number' ? undefined : (Number(b) || 0);
        localName = localName || this.randomName(this._memories);
        if (localName in this._memories) { throw new Error('Memory \'' + localName + '\' already defined in this module'); }
        this._memories[localName] = new Types.LimitType(a, b);
        return this;
    }

    public data(index: number): Uint8Array | null;
    public data(index: number, value: ArrayBuffer | Iterable<number> | string): this;
    public data(index: number, value?: ArrayBuffer | Iterable<number> | string): this | Uint8Array | null {
        if (typeof(value) === 'undefined') {
            return this._data[index] ?
                    new Uint8Array(this._data[index]!) :
                    null;
        }
        else if (typeof(value) === 'string') {
            const e = new TextEncoder()
            value = e.encode(value);
        }
        if (value instanceof ArrayBuffer) {
            this._data[index] = value;
            return this;
        }
        if (!ArrayBuffer.isView(value)) {
            try { value = new Uint8Array(Array.from(value)); } catch {}
        }
        if (!ArrayBuffer.isView(value)) {
            throw new Error('Can not convert value to an Uint8Array');
        }
        this._data[index] = value.buffer;
        return this;
    }

    public importGlobal(module: string, name: string): Types.GlobalType | null;
    public importGlobal(module: string, name: string, type: Types.NumberType | Types.NumberTypeKey, constant?: boolean): this;
    public importGlobal(module: string, name: string, type?: Types.NumberType | Types.NumberTypeKey, constant?: boolean): this | Types.GlobalType | null {
        const mn = module + '.' + name;
        if (!type) {
            return this._imports[mn] instanceof Types.GlobalType ?
                    this._imports[mn]! as Types.GlobalType :
                    null;
        }
        if (typeof(type) === 'string') { type = Types.Type[type]; }
        this._imports[mn] = new Types.GlobalType(type, constant);
        return this;
    }

    public global(localName: string): Sections.GlobalVariable | null;
    public global(type: Types.Type.i64 | 'i64', initial: number | bigint, localName?: string, constant?: boolean): this;
    public global(type: Types.NumberType | Types.NumberTypeKey, initial?: number, localName?: string, constant?: boolean): this;
    public global(type: string | Types.NumberType | Types.NumberTypeKey, initial?: number | bigint, localName?: string, constant?: boolean): this | Sections.GlobalVariable | null {
        if (type in Types.Type && typeof(type) === 'string') { type = Types.Type[type as any] as any as Types.NumberType; }
        if (typeof(type) === 'string') { return this._globals[type] || null; }
        localName = localName || this.randomName(this._globals);
        if (localName in this._globals) {
            throw new Error('Global \'' + localName + '\' already defined in this module');
        }
        let i: new(v?: number) => Expression.NumericConstInstruction;
        switch (type) {
            case Types.Type.i32: i = Expression.I32ConstInstruction;
            case Types.Type.i64: i = Expression.I64ConstInstruction;
            case Types.Type.f32: i = Expression.F32ConstInstruction;
            case Types.Type.f64: i = Expression.F64ConstInstruction;
        }
        this._globals[localName] = new Sections.GlobalVariable(
            type,
            new Expression.Expression([ new i(initial as number) ]),
            constant
        );
        return this;
    }


    public importFunction(module: string, name: string): Types.FunctionType | null;
    public importFunction(module: string, name: string, fn: BuildingCallback<FunctionImporterBuilder>): this;
    public importFunction(module: string, name: string, fn?: BuildingCallback<FunctionImporterBuilder>): this | Types.FunctionType | null {
        const mn = module + '.' + name;
        if (!fn) {
            return this._imports[mn] instanceof Types.FunctionType ?
                    this._imports[mn]! as Types.FunctionType :
                    null;
        }
        this._imports[mn] = fn(new FunctionImporterBuilder(this)).build();
        return this;
    }

    public function(localName: string): FunctionDefinition | null;
    public function(fn: BuildingCallback<FunctionBuilder>, localName?: string, starter?: boolean): this;
    public function(fn: BuildingCallback<FunctionBuilder> | string, localName?: string, starter?: boolean): this | FunctionDefinition | null {
        if (typeof(fn) === 'string') { return this._functions[fn] || null; }
        localName = localName || this.randomName(this._functions);
        if (localName in this._functions) { throw new Error('Function \'' + localName + '\' already defined in this module'); }
        this._functions[localName] = fn(new FunctionBuilder(this)).build();
        if (starter) { this._starter = localName; }
        return this;
    }

    public starter(name: string): this {
        if (name in this._functions) { this._starter = name; }
        return this;
    }

    public sourceMap(url: string | null): this { this._sourcemap = url; return this; }
    public unsetSourceMap(): this { return this.sourceMap(null); }

    public build(): Module {
        const m = new Module(this._version);
        const names = new Sections.NameCustomSection();
        m.CustomSections.push(names);
        for (const name in this._imports) {
            const mn = (name + '').split('.', 2);
            const im = new Sections.ImportSegment(mn[0]!, mn[1]!, this._imports[name]!);
            m.ImportSection.add(im, m);
        }
        for (const name in this._globals) {
            const g = this._globals[name]!;
            const gv = new Sections.GlobalVariable(
                g.Variable.Type,
                new Expression.Expression(g.Initialization.Instructions),
                g.Variable.Constant
            );
            m.GlobalSection.add(gv);
        }
        for (const _ in this._data) {
            // const d = this._data[index]!;
            const ds = new Sections.DataSegment(Sections.DataSegmentKind.passive);
            throw new Error('Data Sections building not yet implemented');
            m.DataSection.add(ds)
        }
        for (const name in this._memories) {
            const mm = this._memories[name]!;
            m.MemorySection.add(new Types.LimitType(mm.Min, mm.Max));
        }
        let keys = Object.keys(this._functions);
        for (const name in this._functions) {
            const def = this._functions[name]!;
            const i = m.TypeSection.indexOf(this._functions[name]!.type);
            if (def.exported) { m.ExportSection.add(new Sections.ExportSegment(def.exported, def.type)); }
            m.TypeSection.add(def.type);
            m.FunctionSection.add(def.type);
            m.CodeSection.add(new Sections.CodeSegment(def.type, def.body, Object.values(def.locals)));
            if (i !== -1) {
                names.function(new Sections.NameReference(i, name));
                if (this._starter === name) { m.StartSection.Target = m.TypeSection.Types[i]!; }
            }
            def.references.map(k => keys.indexOf(k))
        }
        if (this._sourcemap) { m.CustomSections.push(new Sections.SourceMapSection(this._sourcemap)); }
        return m;
    }
}

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

type Integers = Types.Type.i32 | Types.Type.i64;
type IntegerKeys = Types.TypesKey<Integers>;
type Floats = Types.Type.f32 | Types.Type.f64;
type FloatsKeys = Types.TypesKey<Floats>;

export class ExpressionBuilder implements IBuilder<Expression.Expression> {

    private _stack: Types.Stack;
    private _instructions: Expression.Instruction[];
    private _labels: { [key: string]: Expression.AbstractBlockInstruction };
    private _parent: ExpressionBuilder | null;
    private _function: FunctionBuilder;

    public get labels(): { [key: string]: Expression.AbstractBlockInstruction } {
        return Object.assign({}, this._parent && this._parent.labels || {}, this._labels);
    }
    public get function(): FunctionBuilder { return this._function; }

    public constructor(fn: FunctionBuilder, parent: ExpressionBuilder | null = null) {
        this._function = fn;
        this._instructions = [];
        this._stack = [];
        this._labels = { };
        if (parent && !(parent instanceof ExpressionBuilder)) {
            throw new TypeError('Expression Builder parent must be an Expression Builder itself');
        }
        this._parent = parent;
    }

    public addInstruction(...instructions: Exprimible[]): this {
        instructions.forEach(i => {
            if (!(i instanceof Expression.Instruction)) {
                if ('instance' in i && i.instance instanceof Expression.Instruction) { i = i.instance; }
                else { throw new Error('Invalid body expression: ' + i); }
            }
            // this._stack = i.evaluate(this._stack);
            this._instructions.push(i);
        })
        return this;
    }

    public label(label: string): Expression.AbstractBlockInstruction;
    public label<B extends boolean>(label: string, pass: boolean): Expression.Passable<B, Expression.AbstractBlockInstruction>;
    public label(label: string, block: Expression.AbstractBlockInstruction): this;
    public label(label: string, block?: Expression.AbstractBlockInstruction | boolean): this | Expression.AbstractBlockInstruction | null {
        label = '' + label;
        if (block instanceof Expression.AbstractBlockInstruction) {
            if (label in this.labels) { throw new Error('Expression Builder label \'' + label + '\' already declared in this scope'); }
            this._labels[label] = block;
            return this;
        }
        let result = this.labels[label] || null;
        if (!block && !result) { throw new Error('Expression Builder undefined label \'' + label + '\''); }
        return result;
    }

    public throw(): this { return this.unreachable(); }
    public unreachable(): this { return this.addInstruction(Expression.UnreachableInstruction.instance); }
    public nop(): this { return this.addInstruction(Expression.NopInstruction.instance); }

    public block(expression: BuildingCallback<ExpressionBuilder>, label?: string): this;
    public block(...expressions_label: Exprimible[] | [...Exprimible[], string]): this;
    public block(expression: BuildingCallback<ExpressionBuilder> | Exprimible, ...instructions: any[]): this {
        let label = arguments[arguments.length - 1];
        instructions = instructions.filter(i =>
            i instanceof Expression.Instruction ||
            (i && i.instance instanceof Expression.Instruction)
        )
        let block;
        if (typeof(expression) === 'function') {
            block = expression(new ExpressionBuilder(this._function, this)).build().Instructions;
        }
        else { block = [ expression, ...instructions ]; }
        block = block.map(e => e instanceof Expression.Instruction ? e : e.instance);
        let target = Expression.Instruction.resolveStack(block, this._stack);
        let type: null | Types.ValueType | Types.FunctionType;
        if (!target.length && !this._stack.length) { type = null; }
        else if (!this._stack.length && target.length === 1) { type = target[0]!; }
        else { type = new Types.FunctionType(this._stack, target); }
        let instruction = new Expression.BlockInstruction(type, block);
        if (instructions.indexOf(label) !== -1) { this.label(label, instruction); }
        return this.addInstruction(instruction);
    }

    public loop(expression: BuildingCallback<ExpressionBuilder>): this;
    public loop(...expressions: Exprimible[]): this;
    public loop(expression: BuildingCallback<ExpressionBuilder> | Exprimible, ...instructions: Exprimible[]): this {
        let label = arguments[arguments.length - 1];
        instructions = instructions.filter(i =>
            i instanceof Expression.Instruction ||
            (i && i.instance instanceof Expression.Instruction)
        )
        let block;
        if (typeof(expression) === 'function') {
            block = expression(new ExpressionBuilder(this._function, this)).build().Instructions;
        }
        else { block = [ expression, ...instructions ]; }
        block = block.map(e => e instanceof Expression.Instruction ? e : e.instance);
        let target = Expression.Instruction.resolveStack(block, this._stack);
        let type: null | Types.ValueType | Types.FunctionType;
        if (!target.length && !this._stack.length) { type = null; }
        else if (!this._stack.length && target.length === 1) { type = target[0]!; }
        else { type = new Types.FunctionType(this._stack, target); }
        let instruction = new Expression.LoopInstruction(type, block);
        if (instructions.indexOf(label) !== -1) { this.label(label, instruction); }
        return this.addInstruction(instruction);
    }

    public if(
        thenBlock: BuildingCallback<ExpressionBuilder> | Exprimible[],
        elseBlock?: BuildingCallback<ExpressionBuilder> | Exprimible[],
        label?: string
    ): this {
        let tb;
        if (typeof(thenBlock) === 'function') {
            tb = thenBlock(new ExpressionBuilder(this._function, this)).build().Instructions;
        }
        else { tb = thenBlock; }
        tb = tb.map(e => e instanceof Expression.Instruction ? e : e.instance);
        let ttarget = Expression.Instruction.resolveStack(tb, this._stack);
        let ttype: null | Types.ValueType | Types.FunctionType;
        if (!ttarget.length && !this._stack.length) { ttype = null; }
        else if (!this._stack.length && ttarget.length === 1) { ttype = ttarget[0]!; }
        else { ttype = new Types.FunctionType(this._stack, ttarget); }
        let eb;
        if (typeof(elseBlock) === 'function') {
            eb = elseBlock(new ExpressionBuilder(this._function, this)).build().Instructions;
        }
        else { eb = elseBlock || []; }
        eb = eb.map(e => e instanceof Expression.Instruction ? e : e.instance);
        let instruction = new Expression.IfThenElseInstruction(ttype, tb, eb);
        if (typeof(label) !== 'undefined') { this.label(label, instruction); }
        return this.addInstruction(instruction)
    }

    public branch(label: string): this {
        return this.addInstruction(new Expression.BranchInstruction(this.label(label)));
    }
    public branchIf(label: string): this {
        return this.addInstruction(new Expression.BranchIfInstruction(this.label(label)));
    }
    public branchTable(label: string, ...labels: string[]): this {
        return this.addInstruction(new Expression.BranchTableInstruction(
            this.label(label),
            ...labels.map(l => this.label(l))
        ));
    }
    public return(): this { return this.addInstruction(Expression.ReturnInstruction.instance); }

    public call(name: string): this;
    public call(name: string, external: boolean, min?: number, max?: number): this;
    public call(name: string, external?: boolean, min?: number, max?: number): this {
        if (!external) {
            const fn = this._function.module.function(name);
            if (!fn) { throw new Error('Function definition not found: \'' + name +'\''); }
            return this.addInstruction(new Expression.CallInstruction(fn.type));
        }
        else {
            const md = name.split('.', 2);
            const im = this._function.module.importFunction(md[0]!, md[1]!);
            if (!im) { throw new Error('Import definition not found: \'' + name +'\''); }
            else if (!(im instanceof Types.FunctionType)) { throw new Error('Import definition is not a function: \'' + name +'\''); }
            return this.addInstruction(new Expression.CallInstruction(im));
        }
        (min || 0) + (max || 0);
    }

    public reference(ref: boolean | null | string = null): this {
        if (typeof(ref) === 'undefined' || ref === null) {
            return this.addInstruction(Expression.ReferenceIsNullInstruction.instance)
        }
        if (typeof(ref) === 'boolean') {
            return this.addInstruction(
                ref ?
                    Expression.ReferenceNullInstruction.ExternalRef :
                    Expression.ReferenceNullInstruction.FunctionRef
            );
        }
        throw new Error('Reference not implemented');
        // return this.addInstruction(new Expression.ReferenceFunctionInstruction(ref));
    }

    public drop(): this { return this.addInstruction(Expression.DropInstruction.instance); }
    public select(...values: Types.ValueType[]): this {
        return this.addInstruction(
            !arguments.length ?
                Expression.SelectInstruction.instance :
                new Expression.SelectAllInstruction(values)
        );
    }

    public local(index: number, tee?: boolean): this {
            return typeof(tee) === 'undefined'?
                    this.getLocal(index) :
                tee ?
                    this.teeLocal(index) :
                    this.setLocal(index)
            ;
    }
    public getLocal(index: number): this { return this.addInstruction(new Expression.LocalGetInstruction(index)); }
    public setLocal(index: number): this { return this.addInstruction(new Expression.LocalSetInstruction(index)); }
    public teeLocal(index: number): this { return this.addInstruction(new Expression.LocalTeeInstruction(index)); }

    public global(name: string, set: boolean = false): this { return set ? this.setGlobal(name) : this.getGlobal(name); }
    public getGlobal(name: string): this { return this.addInstruction(new Expression.GlobalGetInstruction(Sections.GlobalVariable.refer(name))); }
    public setGlobal(name: string): this { return this.addInstruction(new Expression.GlobalSetInstruction(Sections.GlobalVariable.refer(name))); }


    public loadInt32(): this { return this.addInstruction(Expression.I32LoadInstruction.instance); }
    public loadInt64(): this { return this.addInstruction(Expression.I64LoadInstruction.instance); }
    public load8AsInt32(): this { return this.addInstruction(Expression.I32Load8SignedLoadInstruction.instance); }
    public load8AsUInt32(): this { return this.addInstruction(Expression.I32Load8UnsignedLoadInstruction.instance); }
    public load16AsInt32(): this { return this.addInstruction(Expression.I32Load16SignedLoadInstruction.instance); }
    public load16AsUInt32(): this { return this.addInstruction(Expression.I32Load16UnsignedLoadInstruction.instance); }
    public load8AsInt64(): this { return this.addInstruction(Expression.I64Load8SignedLoadInstruction.instance); }
    public load8AsUInt64(): this { return this.addInstruction(Expression.I64Load8UnsignedLoadInstruction.instance); }
    public load16AsInt64(): this { return this.addInstruction(Expression.I64Load16SignedLoadInstruction.instance); }
    public load16AsUInt64(): this { return this.addInstruction(Expression.I64Load16UnsignedLoadInstruction.instance); }
    public load32AsInt64(): this { return this.addInstruction(Expression.I64Load32SignedLoadInstruction.instance); }
    public load32AsUInt64(): this { return this.addInstruction(Expression.I64Load32UnsignedLoadInstruction.instance); }
    
    public loadFloat32(): this { return this.addInstruction(Expression.F32LoadInstruction.instance); }
    public loadFloat64(): this { return this.addInstruction(Expression.F64LoadInstruction.instance); }

    public memorySize(): this { return this.addInstruction(Expression.MemorySizeInstruction.instance); }
    public memoryGrow(): this { return this.addInstruction(Expression.MemoryGrowInstruction.instance); }
    public memoryCopy(): this { return this.addInstruction(Expression.MemoryCopyInstruction.instance); }
    public memoryFill(): this { return this.addInstruction(Expression.MemoryFillInstruction.instance); }

    protected _discriminate<T extends Types.Type, A extends any[]=[]>(
        mapping: { [key in Types.TypesKey<T>]: (this: this, ...args: A) => this },
        type: T | Types.TypesKey<T>,
        ...args: A
    ): this {
        if (typeof(type) === 'number') { type = Types.Type[type] as Types.TypesKey<T>; }
        if (typeof(mapping[type]) === 'function') { return mapping[type].apply(this, args); }
        throw new Error('Invalid type')
    }

    public const(value: number | bigint, type: Types.Type.i64 | 'i64'): this;
    public const(value: number, type?: Types.NumberType | Types.NumberTypeKey): this;
    public const(value: number, type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType, [ number ]>({
            i32: this.constInt32, i64: this.constInt64,
            f32: this.constFloat32, f64: this.constFloat64
         }, type, value);
    }
    public isZero(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({ i32: this.isZeroInt32, i64: this.isZeroInt64 }, type);
    }
    public equal(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.equalInt32, i64: this.equalInt64,
            f32: this.equalFloat32, f64: this.equalFloat64
        }, type);
    }
    public notEqual(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.notEqualInt32, i64: this.notEqualInt64,
            f32: this.notEqualFloat32, f64: this.notEqualFloat64
        }, type);
    }
    public lesser(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.lesserInt32, i64: this.lesserInt64,
            f32: this.lesserFloat32, f64: this.lesserFloat64
        }, type);
    }
    public greater(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.greaterInt32, i64: this.greaterInt64,
            f32: this.greaterFloat32, f64: this.greaterFloat64
        }, type);
    }
    public lesserEqual(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.lesserEqualInt32, i64: this.lesserEqualInt64,
            f32: this.lesserEqualFloat32, f64: this.lesserEqualFloat64
        }, type);
    }
    public greaterEqual(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.greaterEqualInt32, i64: this.greaterEqualInt64,
            f32: this.greaterEqualFloat32, f64: this.greaterEqualFloat64
        }, type);
    }
    public add(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.addInt32, i64: this.addInt64,
            f32: this.addFloat32, f64: this.addFloat64
        }, type);
    }
    public sub(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.subInt32, i64: this.subInt64,
            f32: this.subFloat32, f64: this.subFloat64
        }, type);
    }
    public mul(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.mulInt32, i64: this.mulInt64,
            f32: this.mulFloat32, f64: this.mulFloat64
        }, type);
    }
    public div(type: Floats | FloatsKeys): this;
    public div(type?: Integers | IntegerKeys, unsigned?: boolean): this;
    public div(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32, unsigned?: boolean): this {
        return this._discriminate<Types.NumberType>({
            i32: unsigned ? this.divUInt32 : this.divInt32,
            i64: unsigned ? this.divUInt64 : this.divInt64,
            f32: this.divFloat32, f64: this.divFloat64
        }, type);
    }

    public remainder(type: Integers | IntegerKeys = Types.Type.i32, unsigned?: boolean): this {
        return this._discriminate<Integers>({
            i32: unsigned ? this.remainderUInt32 : this.remainderInt32,
            i64: unsigned ? this.remainderUInt64 : this.remainderInt64
        }, type)
    }
    public and(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({
            i32: this.andInt32,
            i64: this.andInt64
        }, type)
    }
    public or(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({
            i32: this.orInt32,
            i64: this.orInt64
        }, type)
    }
    public xor(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({
            i32: this.xorInt32,
            i64: this.xorInt64
        }, type)
    }
    public shiftLeft(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({
            i32: this.shiftLeftInt32,
            i64: this.shiftLeftInt64
        }, type)
    }
    public shiftRight(type: Integers | IntegerKeys = Types.Type.i32, unsigned?: boolean): this {
        return this._discriminate<Integers>({
            i32: unsigned ? this.shiftRightUInt32 : this.shiftRightInt32,
            i64: unsigned ? this.shiftRightUInt64 : this.shiftRightInt64
        }, type)
    }
    public rotateLeft(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({
            i32: this.rotateLeftInt32,
            i64: this.rotateLeftInt64
        }, type)
    }
    public rotateRight(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({
            i32: this.rotateRightInt32,
            i64: this.rotateRightInt64
        }, type)
    }
    public abs(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.absFloat32,
            f64: this.absFloat64
        }, type)
    }
    public neg(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.negFloat32,
            f64: this.negFloat64
        }, type)
    }
    public ceil(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.ceilFloat32,
            f64: this.ceilFloat64
        }, type)
    }
    public floor(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.floorFloat32,
            f64: this.floorFloat64
        }, type)
    }
    public truncate(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.truncateFloat32,
            f64: this.truncateFloat64
        }, type)
    }
    public nearest(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.nearestFloat32,
            f64: this.nearestFloat64
        }, type)
    }
    public sqrt(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.sqrtFloat32,
            f64: this.sqrtFloat64
        }, type)
    }
    public min(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.minFloat32,
            f64: this.minFloat64
        }, type)
    }
    public max(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.maxFloat32,
            f64: this.maxFloat64
        }, type)
    }
    public sign(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.signFloat32,
            f64: this.signFloat64
        }, type)
    }

    public constInt32(value: number, ...values: number[]): this {
        values.unshift(value);
        return this.addInstruction(...values.map(v => new Expression.I32ConstInstruction(v)));
    }
    public constInt64(value: number, ...values: number[]): this {
        values.unshift(value);
        return this.addInstruction(...values.map(v => new Expression.I64ConstInstruction(v)));
    }
    public constFloat32(value: number, ...values: number[]): this {
        values.unshift(value);
        return this.addInstruction(...values.map(v => new Expression.F32ConstInstruction(v)));
    }
    public constFloat64(value: number, ...values: number[]): this {
        values.unshift(value);
        return this.addInstruction(...values.map(v => new Expression.F64ConstInstruction(v)));
    }

    public isZeroInt32(): this { return this.addInstruction(Expression.I32EqualZeroInstruction.instance); }
    public equalInt32(): this { return this.addInstruction(Expression.I32EqualInstruction.instance); }
    public notEqualInt32(): this { return this.addInstruction(Expression.I32NotEqualInstruction.instance); }
    public lesserInt32(): this { return this.addInstruction(Expression.I32LesserSignedInstruction.instance); }
    public lesserUInt32(): this { return this.addInstruction(Expression.I32LesserUnsignedInstruction.instance); }
    public greaterInt32(): this { return this.addInstruction(Expression.I32GreaterSignedInstruction.instance); }
    public greaterUInt32(): this { return this.addInstruction(Expression.I32GreaterUnsignedInstruction.instance); }
    public lesserEqualInt32(): this { return this.addInstruction(Expression.I32LesserEqualSignedInstruction.instance); }
    public lesserEqualUInt32(): this { return this.addInstruction(Expression.I32LesserEqualUnsignedInstruction.instance); }
    public greaterEqualInt32(): this { return this.addInstruction(Expression.I32GreaterEqualSignedInstruction.instance); }
    public greaterEqualUInt32(): this { return this.addInstruction(Expression.I32GreaterEqualUnsignedInstruction.instance); }
    public leadingZerosUInt32(): this { return this.addInstruction(Expression.I32LeadingBitsUnsigendInstruction.instance); }
    public trailingZerosUInt32(): this { return this.addInstruction(Expression.I32TrailingBitsUnsigendInstruction.instance); }
    public bitCountInt32(): this { return this.addInstruction(Expression.I32BitCountInstruction.instance); }
    public addInt32(): this { return this.addInstruction(Expression.I32AddInstruction.instance); }
    public subInt32(): this { return this.addInstruction(Expression.I32SubtractInstruction.instance); }
    public mulInt32(): this { return this.addInstruction(Expression.I32MultiplyInstruction.instance); }
    public divInt32(): this { return this.addInstruction(Expression.I32DivideSignedInstruction.instance); }
    public divUInt32(): this { return this.addInstruction(Expression.I32DivideUnsignedInstruction.instance); }
    public remainderInt32(): this { return this.addInstruction(Expression.I32RemainderSignedInstruction.instance); }
    public remainderUInt32(): this { return this.addInstruction(Expression.I32RemainderUnsignedInstruction.instance); }
    public andInt32(): this { return this.addInstruction(Expression.I32AndInstruction.instance); }
    public orInt32(): this { return this.addInstruction(Expression.I32OrInstruction.instance); }
    public xorInt32(): this { return this.addInstruction(Expression.I32XOrInstruction.instance); }
    public shiftLeftInt32(): this { return this.addInstruction(Expression.I32BitShifLeftInstruction.instance); }
    public shiftRightInt32(): this { return this.addInstruction(Expression.I32BitShifRightSignedInstruction.instance); }
    public shiftRightUInt32(): this { return this.addInstruction(Expression.I32BitShifRightUnsignedInstruction.instance); }
    public rotateLeftInt32(): this { return this.addInstruction(Expression.I32BitRotationLeftInstruction.instance); }
    public rotateRightInt32(): this { return this.addInstruction(Expression.I32BitRotationRightInstruction.instance); }

    public isZeroInt64(): this { return this.addInstruction(Expression.I64EqualZeroInstruction.instance); }
    public equalInt64(): this { return this.addInstruction(Expression.I64EqualInstruction.instance); }
    public notEqualInt64(): this { return this.addInstruction(Expression.I64NotEqualInstruction.instance); }
    public lesserInt64(): this { return this.addInstruction(Expression.I64LesserSignedInstruction.instance); }
    public lesserUInt64(): this { return this.addInstruction(Expression.I64LesserUnsignedInstruction.instance); }
    public greaterInt64(): this { return this.addInstruction(Expression.I64GreaterSignedInstruction.instance); }
    public greaterUInt64(): this { return this.addInstruction(Expression.I64GreaterUnsignedInstruction.instance); }
    public lesserEqualInt64(): this { return this.addInstruction(Expression.I64LesserEqualSignedInstruction.instance); }
    public lesserEqualUInt64(): this { return this.addInstruction(Expression.I64LesserEqualUnsignedInstruction.instance); }
    public greaterEqualInt64(): this { return this.addInstruction(Expression.I64GreaterEqualSignedInstruction.instance); }
    public greaterEqualUInt64(): this { return this.addInstruction(Expression.I64GreaterEqualUnsignedInstruction.instance); }
    public leadingZerosUInt64(): this { return this.addInstruction(Expression.I64LeadingBitsUnsigendInstruction.instance); }
    public trailingZerosUInt64(): this { return this.addInstruction(Expression.I64TrailingBitsUnsigendInstruction.instance); }
    public bitCountInt64(): this { return this.addInstruction(Expression.I64BitCountInstruction.instance); }
    public addInt64(): this { return this.addInstruction(Expression.I64AddInstruction.instance); }
    public subInt64(): this { return this.addInstruction(Expression.I64SubtractInstruction.instance); }
    public mulInt64(): this { return this.addInstruction(Expression.I64MultiplyInstruction.instance); }
    public divInt64(): this { return this.addInstruction(Expression.I64DivideSignedInstruction.instance); }
    public divUInt64(): this { return this.addInstruction(Expression.I64DivideUnsignedInstruction.instance); }
    public remainderInt64(): this { return this.addInstruction(Expression.I64RemainderSignedInstruction.instance); }
    public remainderUInt64(): this { return this.addInstruction(Expression.I64RemainderUnsignedInstruction.instance); }
    public andInt64(): this { return this.addInstruction(Expression.I64AndInstruction.instance); }
    public orInt64(): this { return this.addInstruction(Expression.I64OrInstruction.instance); }
    public xorInt64(): this { return this.addInstruction(Expression.I64XOrInstruction.instance); }
    public shiftLeftInt64(): this { return this.addInstruction(Expression.I64BitShifLeftInstruction.instance); }
    public shiftRightInt64(): this { return this.addInstruction(Expression.I64BitShifRightSignedInstruction.instance); }
    public shiftRightUInt64(): this { return this.addInstruction(Expression.I64BitShifRightUnsignedInstruction.instance); }
    public rotateLeftInt64(): this { return this.addInstruction(Expression.I64BitRotationLeftInstruction.instance); }
    public rotateRightInt64(): this { return this.addInstruction(Expression.I64BitRotationRightInstruction.instance); }

    public equalFloat32(): this { return this.addInstruction(Expression.F32EqualInstruction.instance); }
    public notEqualFloat32(): this { return this.addInstruction(Expression.F32NotEqualInstruction.instance); }
    public lesserFloat32(): this { return this.addInstruction(Expression.F32LesserInstruction.instance); }
    public greaterFloat32(): this { return this.addInstruction(Expression.F32GreaterInstruction.instance); }
    public lesserEqualFloat32(): this { return this.addInstruction(Expression.F32LesserEqualInstruction.instance); }
    public greaterEqualFloat32(): this { return this.addInstruction(Expression.F32GreaterEqualInstruction.instance); }
    public absFloat32(): this { return this.addInstruction(Expression.F32AbsoluteInstruction.instance); }
    public negFloat32(): this { return this.addInstruction(Expression.F32NegativeInstruction.instance); }
    public ceilFloat32(): this { return this.addInstruction(Expression.F32CeilInstruction.instance); }
    public floorFloat32(): this { return this.addInstruction(Expression.F32FloorInstruction.instance); }
    public truncateFloat32(): this { return this.addInstruction(Expression.F32TruncateInstruction.instance); }
    public nearestFloat32(): this { return this.addInstruction(Expression.F32NearestInstruction.instance); }
    public sqrtFloat32(): this { return this.addInstruction(Expression.F32SquareRootInstruction.instance); }
    public addFloat32(): this { return this.addInstruction(Expression.F32AddInstruction.instance); }
    public subFloat32(): this { return this.addInstruction(Expression.F32SubtractInstruction.instance); }
    public mulFloat32(): this { return this.addInstruction(Expression.F32MultiplyInstruction.instance); }
    public divFloat32(): this { return this.addInstruction(Expression.F32DivideInstruction.instance); }
    public minFloat32(): this { return this.addInstruction(Expression.F32MinInstruction.instance); }
    public maxFloat32(): this { return this.addInstruction(Expression.F32MaxInstruction.instance); }
    public signFloat32(): this { return this.addInstruction(Expression.F32CopySignInstruction.instance); }

    public equalFloat64(): this { return this.addInstruction(Expression.F64EqualInstruction.instance); }
    public notEqualFloat64(): this { return this.addInstruction(Expression.F64NotEqualInstruction.instance); }
    public lesserFloat64(): this { return this.addInstruction(Expression.F64LesserInstruction.instance); }
    public greaterFloat64(): this { return this.addInstruction(Expression.F64GreaterInstruction.instance); }
    public lesserEqualFloat64(): this { return this.addInstruction(Expression.F64LesserEqualInstruction.instance); }
    public greaterEqualFloat64(): this { return this.addInstruction(Expression.F64GreaterEqualInstruction.instance); }
    public absFloat64(): this { return this.addInstruction(Expression.F64AbsoluteInstruction.instance); }
    public negFloat64(): this { return this.addInstruction(Expression.F64NegativeInstruction.instance); }
    public ceilFloat64(): this { return this.addInstruction(Expression.F64CeilInstruction.instance); }
    public floorFloat64(): this { return this.addInstruction(Expression.F64FloorInstruction.instance); }
    public truncateFloat64(): this { return this.addInstruction(Expression.F64TruncateInstruction.instance); }
    public nearestFloat64(): this { return this.addInstruction(Expression.F64NearestInstruction.instance); }
    public sqrtFloat64(): this { return this.addInstruction(Expression.F64SquareRootInstruction.instance); }
    public addFloat64(): this { return this.addInstruction(Expression.F64AddInstruction.instance); }
    public subFloat64(): this { return this.addInstruction(Expression.F64SubtractInstruction.instance); }
    public mulFloat64(): this { return this.addInstruction(Expression.F64MultiplyInstruction.instance); }
    public divFloat64(): this { return this.addInstruction(Expression.F64DivideInstruction.instance); }
    public minFloat64(): this { return this.addInstruction(Expression.F64MinInstruction.instance); }
    public maxFloat64(): this { return this.addInstruction(Expression.F64MaxInstruction.instance); }
    public signFloat64(): this { return this.addInstruction(Expression.F64CopySignInstruction.instance); }

    public convert(source: 0x08 | 'i8', destination: Integers | IntegerKeys): this;
    public convert(source: 0x10 | 'i16', destination: Integers | IntegerKeys): this;
    public convert(
        source: Types.Type.i32 | 'i32',
        destination: Floats | FloatsKeys | Types.Type.i64 | 'i64',
        options?: { unsigned?: boolean }
    ): this;
    public convert(
        source: Types.Type.i64 | 'i64',
        destination: Types.Type.i32 |'i32'
    ): this;
    public convert(
        source: Types.Type.i64 | 'i64',
        destination: Floats | FloatsKeys,
        options?: { unsigned?: boolean }
    ): this;
    public convert(
        source: Types.Type.f32 | 'f32',
        destination: Types.Type.f64 | 'f64'
    ): this;
    public convert(
        source: Types.Type.f32 | 'f32',
        destination: Types.Type.i32 | 'i32',
        options?: { unsigned: boolean, mode?: 'truncate' | 'saturate' }
    ): this;
    public convert(
        source: Types.Type.f32 | 'f32',
        destination: Types.Type.i32 | 'i32',
        options?: { mode?: 'reinterpret' | 'truncate' | 'saturate' }
    ): this;
    public convert(
        source: Types.Type.f32 | 'f32',
        destination: Types.Type.i64 | 'i64',
        options?: { mode?: 'truncate' | 'saturate' }
    ): this;
    public convert(
        source: Types.Type.f64 | 'f64',
        destination: Types.Type.f32 | 'f32'
    ): this;
    public convert(
        source: Types.Type.f64 | 'f64',
        destination: Types.Type.i32 | 'i32',
        options?: { mode?: 'truncate' | 'saturate' }
    ): this;
    public convert(
        source: Types.Type.f64 | 'f64',
        destination: Types.Type.i64 | 'i64',
        options?: { mode?: 'reinterpret' | 'truncate' | 'saturate' }
    ): this;
    public convert(
        source: 0x08 | 'i8' | 0x10 | 'i16' | Types.NumberType | Types.NumberTypeKey,
        destination: Types.NumberType | Types.NumberTypeKey,
        options?: { unsigned?: boolean, mode?: 'reinterpret' | 'truncate' | 'saturate' }
    ): this | never;
    public convert(
        source: 0x08 | 'i8' | 0x10 | 'i16' | Types.NumberType | Types.NumberTypeKey,
        destination: Types.NumberType | Types.NumberTypeKey,
        options?: { unsigned?: boolean, mode?: 'reinterpret' | 'truncate' | 'saturate' }
    ): this {
        if (source === 'i8' || source === 0x08) {
            return this._discriminate<Integers>({
                i32: this.extendInt8ToInt32,
                i64: this.extendInt8ToInt64
            }, destination as any);
        }
        if (source === 'i16' || source === 0x10) {
            return this._discriminate<Integers>({
                i32: this.extendInt16ToInt32,
                i64: this.extendInt16ToInt64
            }, destination as any);
        }
        if (typeof(source) === 'string') { source = Types.Type[source]; }
        if (!Types.validNumber(source)) { throw new TypeError('Invalid source type'); }
        if (typeof(destination) === 'string') { destination = Types.Type[destination]; }
        if (!Types.validNumber(destination)) { throw new TypeError('Invalid destination type'); }
        options = Object.assign({ unsigned: false, mode: 'truncate' }, options || {});
        switch (source) {
            case Types.Type.i32: return this._discriminate<Floats | Types.Type.i64>({
                f32: options.unsigned ? this.uint32ToFloat32 : this.int32ToFloat32,
                f64: options.unsigned ? this.uint32ToFloat64 : this.int32ToFloat64,
                i64: options.unsigned ? this.extendUInt32ToInt64 : this.extendInt32ToInt64
            }, destination as any);
            case Types.Type.i64: return this._discriminate<Floats | Types.Type.i32>({
                f32: options.unsigned ? this.uint64ToFloat32 : this.int64ToFloat32,
                f64: options.unsigned ? this.uint64ToFloat64 : this.int64ToFloat64,
                i32: this.wrapInt64InInt32
            }, destination as any);
            case Types.Type.f32: return this._discriminate<Integers | Types.Type.f64>({
                f64: this.promoteFloat32,
                i32: options.mode === 'reinterpret' ? this.float32AsInt32 :
                        options.mode === 'saturate' ?
                            (options.unsigned ? this.saturateFloat32ToUInt32 : this.saturateFloat32ToInt32) :
                            (options.unsigned ?  this.truncateFloat32ToUInt32 : this.truncateFloat32ToInt32),
                i64: options.mode === 'saturate' ?
                        (options.unsigned ? this.saturateFloat32ToUInt64 : this.saturateFloat32ToInt64) :
                        (options.unsigned ?  this.truncateFloat32ToUInt64 : this.truncateFloat32ToInt64)
            }, destination as any)
            case Types.Type.f64: return this._discriminate<Integers | Types.Type.f32>({
                f32: this.demoteFloat64,
                i32: options.mode === 'saturate' ?
                        (options.unsigned ? this.saturateFloat64ToUInt32 : this.saturateFloat64ToInt32) :
                        (options.unsigned ?  this.truncateFloat64ToUInt32 : this.truncateFloat64ToInt32),
                i64: options.mode === 'reinterpret' ? this.float64AsInt64 : 
                        options.mode === 'saturate' ?
                            (options.unsigned ? this.saturateFloat32ToUInt64 : this.saturateFloat32ToInt64) :
                            (options.unsigned ?  this.truncateFloat32ToUInt64 : this.truncateFloat32ToInt64)
            }, destination as any)
            default: throw new Error('Invalid source type');
        }
    }

    public extendInt8ToInt32(): this { return this.addInstruction(Expression.I32Extend8SignedInstruction.instance); }
    public extendInt8ToInt64(): this { return this.addInstruction(Expression.I64Extend8SignedInstruction.instance); }

    public extendInt16ToInt32(): this { return this.addInstruction(Expression.I32Extend16SignedInstruction.instance); }
    public extendInt16ToInt64(): this { return this.addInstruction(Expression.I64Extend16SignedInstruction.instance); }
    
    public extendInt32ToInt64(): this { return this.addInstruction(Expression.I64Extend32SignedInstruction.instance); }
    public extendUInt32ToInt64(): this { return this.addInstruction(Expression.I64ExtendI32UnsignedInstruction.instance); }
    public int32ToFloat32(): this { return this.addInstruction(Expression.F32ConvertI32SignedInstruction.instance); }
    public uint32ToFloat32(): this { return this.addInstruction(Expression.F32ConvertI32UnsignedInstruction.instance); }
    public int32ToFloat64(): this { return this.addInstruction(Expression.F64ConvertI32SignedInstruction.instance); }
    public uint32ToFloat64(): this { return this.addInstruction(Expression.F64ConvertI32UnsignedInstruction.instance); }
    
    public wrapInt64InInt32(): this { return this.addInstruction(Expression.I32WrapI64Instruction.instance); }
    public int64ToFloat32(): this { return this.addInstruction(Expression.F32ConvertI64SignedInstruction.instance); }
    public uint64ToFloat32(): this { return this.addInstruction(Expression.F32ConvertI64UnsignedInstruction.instance); }
    public int64ToFloat64(): this { return this.addInstruction(Expression.F64ConvertI64SignedInstruction.instance); }
    public uint64ToFloat64(): this { return this.addInstruction(Expression.F64ConvertI64UnsignedInstruction.instance); }

    public promoteFloat32(): this { return this.addInstruction(Expression.F64PromoteF32Instruction.instance); }
    public float32AsInt32(): this { return this.addInstruction(Expression.I32ReinterpretF32Instruction.instance); }
    public truncateFloat32ToInt32(): this { return this.addInstruction(Expression.I32TruncateF32SignedInstruction); }
    public truncateFloat32ToUInt32(): this { return this.addInstruction(Expression.I32TruncateF32UnsignedInstruction); }
    public truncateFloat32ToInt64(): this { return this.addInstruction(Expression.I64TruncateF32SignedInstruction.instance); }
    public truncateFloat32ToUInt64(): this { return this.addInstruction(Expression.I64TruncateF32UnsignedInstruction.instance); }
    public saturateFloat32ToInt32(): this { return this.addInstruction(Expression.I32TruncateF32SignedInstruction); }
    public saturateFloat32ToUInt32(): this { return this.addInstruction(Expression.I32TruncateF32UnsignedInstruction); }
    public saturateFloat32ToInt64(): this { return this.addInstruction(Expression.I64TruncateF32SignedInstruction); }
    public saturateFloat32ToUInt64(): this { return this.addInstruction(Expression.I64TruncateF32UnsignedInstruction); }
    
    public demoteFloat64(): this { return this.addInstruction(Expression.F32DemoteF64Instruction.instance); }
    public float64AsInt64(): this { return this.addInstruction(Expression.I64ReinterpretF64Instruction.instance); }
    public truncateFloat64ToInt32(): this { return this.addInstruction(Expression.I32TruncateF64SignedInstruction); }
    public truncateFloat64ToUInt32(): this { return this.addInstruction(Expression.I32TruncateF64UnsignedInstruction); }
    public truncateFloat64ToInt64(): this { return this.addInstruction(Expression.I64TruncateF64SignedInstruction.instance); }
    public truncateFlot64ToUInt64(): this { return this.addInstruction(Expression.I64TruncateF64UnsignedInstruction.instance); }
    public saturateFloat64ToInt32(): this { return this.addInstruction(Expression.I32TruncateF64SignedInstruction); }
    public saturateFloat64ToUInt32(): this { return this.addInstruction(Expression.I32TruncateF64UnsignedInstruction); }
    public saturateFloat64ToInt64(): this { return this.addInstruction(Expression.I64TruncateF64SignedInstruction); }
    public saturateFloat64ToUInt64(): this { return this.addInstruction(Expression.I64TruncateF64UnsignedInstruction); }

    public build(): Expression.Expression { return new Expression.Expression(this._instructions); }
}