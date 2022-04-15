import * as Types from '../Types';
import * as Sections from '../Sections';
import * as Instructions from '../Instructions';
import type { OpCodes } from '../OpCodes';
import type { FunctionBuilder } from './FunctionBuilder';
import type { BuildingCallback, IBuilder } from './index';

type Exprimible<I extends Instructions.Instruction=Instructions.Instruction> = I | { instance: I };
type Integers = Types.Type.i32 | Types.Type.i64;
type IntegerKeys = Types.TypesKey<Integers>;
type Floats = Types.Type.f32 | Types.Type.f64;
type FloatsKeys = Types.TypesKey<Floats>;
type Step = Instructions.Instruction;

type NativeTypes = 'i8' | 'int8' | 'i16' | 'int16' | 'i32' | 'int32' | 'i64' | 'int64' |
                   'u8' | 'uint8' | 'u16' | 'uint16' | 'u32' | 'uint32' | 'u64' | 'uint64' |
                   'byte' | 'short' | 'int' | 'long' |
                   'sbyte' | 'ushort' | 'uint' | 'ulong' |
                   'f32' | 'float32' | 'single' | 'f64' | 'float64' | 'double';

/** Allow to build expressions with ease
 * by accumulating instructions in a scope
 */
export class ExpressionBuilder implements IBuilder<Instructions.Expression> {
    /** Current stack for static checking */
    private _stack: Types.Stack;
    /** Instruction accumulator */
    private _instructions: Step[];
    /** Internal label map for blocks */
    private _labels: Record<string, Instructions.AbstractBlockInstruction>;
    /** Parent expression holding the current one */
    private _parent: ExpressionBuilder | null;
    /** Root builder */
    private _function: FunctionBuilder;

    /** Label map for blocks */
    public get labels(): Record<string, Instructions.AbstractBlockInstruction> {
        return Object.assign({}, this._parent && this._parent.labels || {}, this._labels);
    }
    /** The root function builder of this expression */
    public get function(): FunctionBuilder { return this._function; }

    /** Create a new empty expression builder
     * @param {FunctionBuilder} fn the root function builder
     * @param {(ExpressionBuilder|null)} parent an owner expression, if present
     */
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

    /** Push the given instructions into the current accumulator 
     * @param {...Exprimible[]} instructions the instructions to add
     * @return {this} the builder itself (chainable method)
     */
    public addInstruction(...instructions: Exprimible[]): this {
        instructions.forEach(i => {
            if (!(i instanceof Instructions.Instruction)) {
                if ('instance' in i && i.instance instanceof Instructions.Instruction) { i = i.instance; }
                else { throw new Error('Invalid body expression: ' + i); }
            }
            // this._stack = i.evaluate(this._stack);
            this._instructions.push(i);
        })
        return this;
    }

    /** Retrieve the block associated with a label 
     * @param {string} label the block label
     * @return {Instructions.AbstractBlockInstruction} the retrieved block
     */
    public label(label: string): Instructions.AbstractBlockInstruction;
        /** Retrieve the block associated with a label 
     * @param {string} label the block label
     * @param {B} pass don't throw error if the operation fails (returns `null` on failure)
     * @return {Instructions.Passable<B, Instructions.AbstractBlockInstruction>} the retrieved block or `null` if not present
     */
    public label<B extends boolean>(label: string, pass: B): Instructions.Passable<B, Instructions.AbstractBlockInstruction>;
    /** Associate a block with a label
     * @param {string} label the block label
     * @param {Instructions.AbstractBlockInstruction} block the block to associate to the label
     * @return {this} the builder itself (chainable method)
     */
    public label(label: string, block: Instructions.AbstractBlockInstruction): this;
    public label(label: string, block?: Instructions.AbstractBlockInstruction | boolean): this | Instructions.AbstractBlockInstruction | null {
        label = '' + label;
        if (block instanceof Instructions.AbstractBlockInstruction) {
            if (label in this.labels) { throw new Error('Expression Builder label \'' + label + '\' already declared in this scope'); }
            this._labels[label] = block;
            return this;
        }
        let result = this.labels[label] || null;
        if (!block && !result) { throw new Error('Expression Builder undefined label \'' + label + '\''); }
        return result;
    }

    /** Throws a runtime Error
     * @alias {@link unreachable}
     * @return {this} the builder itself (chainable method)
     */
    public trap(): this { return this.unreachable(); }
    /** Throws a runtime Error
     * @alias {@link trap}
     * @return {this} the builder itself (chainable method)
     */
    public unreachable(): this { return this.addInstruction(Instructions.UnreachableInstruction.instance); }
    /** Performs no operations (does nothing)
     * @return {this} the builder itself (chainable method)
     */
    public nop(): this { return this.addInstruction(Instructions.NopInstruction.instance); }

    private _makeBlock<B extends Instructions.AbstractBlockInstruction>(
        ctor: new (type: Instructions.BlockType, instructions: Instructions.Instruction<OpCodes>[]) => B,
        expression: BuildingCallback<ExpressionBuilder> | Exprimible,
        instructions: Exprimible[]
    ): B {
        let label = arguments[arguments.length - 1];
        instructions = instructions.filter(i =>
            i instanceof Instructions.Instruction ||
            (i && i.instance instanceof Instructions.Instruction)
        )
        let block;
        if (typeof(expression) === 'function') {
            block = expression(new ExpressionBuilder(this._function, this)).build().Instructions;
        }
        else { block = [ expression, ...instructions ]; }
        block = block.map(e => e instanceof Instructions.Instruction ? e : e.instance);
        let target = Instructions.Instruction.resolveStack(block, this._stack);
        let type: null | Types.ValueType | Types.FunctionType;
        if (!target.length && !this._stack.length) { type = null; }
        else if (!this._stack.length && target.length === 1) { type = target[0]!; }
        else { type = new Types.FunctionType(this._stack, target); }
        let instruction = new ctor(type, block);
        if (instructions.indexOf(label) !== -1) { this.label(label, instruction); }
        return instruction;
    }

    /** Add a labeled block to be referenced (the label is placed at the end of the instructions)
     * @param {BuildingCallback<ExpressionBuilder>} expression a callback to build the block with an expression builder
     * @param {string} [label] the label to associate with the block
     * @return {this} the builder itself (chainable method)
     */
    public block(expression: BuildingCallback<ExpressionBuilder>, label?: string): this;
    /** Add a labeled block to be referenced (the label is placed at the end of the instructions)
     * @param {...[...Exprimible[], string?]} expressions_label all the instructions that define the block,
     *      possibly followed by the block label as a string (last argument)
     * @return {this} the builder itself (chainable method)
     */
    public block(...expressions_label: Exprimible[] | [...Exprimible[], string]): this;
    public block(expression: BuildingCallback<ExpressionBuilder> | Exprimible, ...instructions: any[]): this {
        return this.addInstruction(this._makeBlock(Instructions.BlockInstruction, expression, instructions));
    }

    /** Add a labeled loop to be referenced (the label is placed at the start of the instructions)
     * @param {BuildingCallback<ExpressionBuilder>} expression a callback to build the loop with an expression builder
     * @param {string} [label] the label to associate with the loop
     * @return {this} the builder itself (chainable method)
     */
    public loop(expression: BuildingCallback<ExpressionBuilder>, label?: string): this;
    /** Add a labeled loop to be referenced (the label is placed at the start of the instructions)
     * @param {...[...Exprimible[], string?]} expressions_label all the instructions that define the loop,
     *      possibly followed by the loop label as a string (last argument)
     * @return {this} the builder itself (chainable method)
     */
    public loop(...expressions_label: Exprimible[] | [...Exprimible[], string]): this;
    public loop(expression: BuildingCallback<ExpressionBuilder> | Exprimible, ...instructions: any[]): this {
        return this.addInstruction(this._makeBlock(Instructions.LoopInstruction, expression, instructions));
    }

    /** Add a if-then[-else] structure. Can be labeled.
     * The if is checked against the last stack value.
     * @param {(BuildingCallback<ExpressionBuilder> | Exprimible[])} thenBlock 
     *      a callback to build the expression or an array of instructions
     * @param {(BuildingCallback<ExpressionBuilder> | Exprimible[])} [elseBlock]
     *      a callback to build the expression or an array of instructions,
     *      can be omitted
     * @param {string} [label] the label to assign to the if structure
     * @return {this} the builder itself (chainable method)
     */
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
        tb = tb.map(e => e instanceof Instructions.Instruction ? e : e.instance);
        let ttarget = Instructions.Instruction.resolveStack(tb, this._stack);
        let ttype: null | Types.ValueType | Types.FunctionType;
        if (!ttarget.length && !this._stack.length) { ttype = null; }
        else if (!this._stack.length && ttarget.length === 1) { ttype = ttarget[0]!; }
        else { ttype = new Types.FunctionType(this._stack, ttarget); }
        let eb;
        if (typeof(elseBlock) === 'function') {
            eb = elseBlock(new ExpressionBuilder(this._function, this)).build().Instructions;
        }
        else { eb = elseBlock || []; }
        eb = eb.map(e => e instanceof Instructions.Instruction ? e : e.instance);
        let instruction = new Instructions.IfThenElseInstruction(ttype, tb, eb);
        if (typeof(label) !== 'undefined') { this.label(label, instruction); }
        return this.addInstruction(instruction)
    }

    /** Jump to a label
     * @param {string} label the target block
     * @return {this} the builder itself (chainable method)
     */
    public branch(label: string): this {
        return this.addInstruction(new Instructions.BranchInstruction(this.label(label)));
    }
    /** Jump to a label only if the stack contains a truish value (not 0)
     * @param {string} label the target block
     * @return {this} the builder itself (chainable method)
     */
    public branchIf(label: string): this {
        return this.addInstruction(new Instructions.BranchIfInstruction(this.label(label)));
    }
    /** Jump to a given set of labels according to the index present on the stack.
     * It emulates a switch statement.
     * @param {string} label the first label (index 0)
     * @param {...string[]} labels the other labels (index 1, ...)
     * @return {this} the builder itself (chainable method)
     */
    public branchTable(label: string, ...labels: string[]): this {
        return this.addInstruction(new Instructions.BranchTableInstruction(
            this.label(label),
            ...labels.map(l => this.label(l))
        ));
    }

    /** Return from the current function, is pratically a shortand to
     * a {@link branch} to the outermost block
     * @return {this} the builder itself (chainable method)
     */
    public return(): this { return this.addInstruction(Instructions.ReturnInstruction.instance); }
    
    /** Call a function by its local name.
     * The parameters must be present on the stack.
     * The results will be pushed when the call returns.
     * @param {string} name the local name of the function
     * @param {boolean} [external=false] whether the function comes from an import or not
     * @return {this} the builder itself (chainable method)
     */
    public call(name: string, external: boolean=false): this {
        if (!external) {
            const fn = this._function.module.function(name);
            if (!fn) { throw new Error('Function definition not found: \'' + name +'\''); }
            return this.addInstruction(new Instructions.CallInstruction(fn.type));
        }
        const md = name.split('.', 2);
        const im = this._function.module.importFunction(md[0] || '', md[1] || '');
        if (!im) { throw new Error('Import definition not found: \'' + name +'\''); }
        else if (!(im instanceof Types.FunctionType)) { throw new Error('Import definition is not a function: \'' + name +'\''); }
        return this.addInstruction(new Instructions.CallInstruction(im));
    }

    /** Call a function present in the module table, by accessing it with an index.
     * The parameters must be present on the stack, then the index (i32) of the
     * table must appear.
     * The results will be pushed when the call returns.
     * @param {Types.FunctionType} type the signature of the called function,
     *      given that a table store a `anyfunc` pointer it must be specified
     *      in the caller site.
     * @param {(string|Types.TableType)} [table] the target table
     *      (assumes the first table since Wasm v1 does not allow multiple tables)
     * @return {this} the builder itself (chainable method)
     */
    public callIndirect(type: Types.FunctionType, table?: string | Types.TableType): this {
        const t = typeof(table) === 'string' ?
                    this._function.module.table(table) :
                    (table || this._function.module.table());
        if (!t) { throw new Error('Can not resolve table: \'' + table + '\''); }
        return this.addInstruction(new Instructions.CallIndirectInstruction(type, t))
    }

    /** Pushes a null reference into the stack
     * (shorthand for {@link reference reference(null)})
     * @return {this} the builder itself (chainable method)
     */
    public null(): this { return this.reference(null); }

    /** Check if the current reference on the stack is null
     * @param {boolean} isObject if true check against `externref` object type,
     *      otherwise against `funcref`
     * @return {this} the builder itself (chainable method)
     */
    public reference(isObject: boolean): this;
    /** Pushes a null reference into the stack
     * @param {null} nullRef the null reference to be pushed
     * @return {this} the builder itself (chainable method)
     */
    public reference(nullRef: null): this;
    /** Retrieve the function pointer to a given function and push it into the stack
     * @param {(string|Types.FunctionType)} ref the reference to the function
     * @return {this} the builder itself (chainable method)
     */
    public reference(ref: string | Types.FunctionType): this;
    /** Perform a reference action:
     * - `boolean`: Check if the current reference on the stack is null
     * - `null`: Pushes a null reference into the stack
     * - `string|FunctionType`: Retrieve the function pointer to a given function and push it into the stack
     * @param {(boolean|null|string|Types.FunctionType)} action depends on the variable type:
     * - `boolean`: if true check against `externref` object type, otherwise against `funcref`
     * - `null`: the null reference to be pushed
     * - `string|FunctionType`: the reference to the function
     * @return {this} the builder itself (chainable method)
     */
    public reference(action: boolean | null | string | Types.FunctionType): this;
    public reference(ref: boolean | null | string | Types.FunctionType): this {
        if (ref === null) {
            return this.addInstruction(Instructions.ReferenceIsNullInstruction.instance)
        }
        if (typeof(ref) === 'boolean') {
            return this.addInstruction(
                ref ?
                    Instructions.ReferenceNullInstruction.ExternalRef :
                    Instructions.ReferenceNullInstruction.FunctionRef
            );
        }
        throw new Error('ReferenceFunctionInstruction not yet implemented');
        // if (typeof(ref) === 'string') { ref = this._function.module.function(ref) }
        // return this.addInstruction(new Instructions.ReferenceFunctionInstruction(ref));
    }

    /** Pop the last element on the stack
     * @param {number} [amount=1] the number of elements to pop
     * @return {this} the builder itself (chainable method)
     */
    public drop(amount: number=1): this {
        amount = Math.floor(Number(amount) || 0);
        if (amount <= 0) { return this; }
        else if (amount === 1) { return this.addInstruction(Instructions.DropInstruction.instance); }
        return this.addInstruction(
            ...Array.from(Array(amount))
                    .map(_ => Instructions.DropInstruction.instance)
        );
    }

    /** Performs a ternary operator with the last 3 elements on the stack:
     * 
     * `stack: [$1, $2, $3] --> ($3 ? $1 : $2)`
     * @param {...Types.ValueType[]} values check that the stack contains
     *      the given value types. If no values are passed does not check at all.
     * @return {this} the builder itself (chainable method)
     */
    public select(...values: Types.ValueType[]): this {
        return this.addInstruction(
            !values.length ?
                Instructions.SelectInstruction.instance :
                new Instructions.SelectAllInstruction(values)
        );
    }

    /** Perform an operation on a local variable at the given index
     * @param {(number|string)} index thee index or local name of the local variable
     * @param {(boolean|undefined)} [tee] possibilities:
     * - `true`: performs a {@link teeLocal}
     * - `false`: performs a {@link setLocal}
     * - `undefined`: performs a {@link getLocal}
     * @return {this} the builder itself (chainable method)
     */
    public local(index: number | string, tee?: boolean): this {
        index = this._function.checkLocal(index);
        return typeof(tee) === 'undefined'?
                this.getLocal(index) :
            tee ?
                this.teeLocal(index) :
                this.setLocal(index)
        ;
    }
    /** Pushes the given local variable value into the stack
     * @param {(number|string)} index thee index or local name of the local variable
     * @return {this} the builder itself (chainable method)
     */
    public getLocal(index: number | string): this { return this.addInstruction(new Instructions.LocalGetInstruction(this._function.checkLocal(index))); }
    /** Set the given local variable value to the last stack value (popping it from the stack)
     * @param {(number|string)} index thee index or local name of the local variable
     * @return {this} the builder itself (chainable method)
     */
    public setLocal(index: number | string): this { return this.addInstruction(new Instructions.LocalSetInstruction(this._function.checkLocal(index))); }
    /** Set the given local variable value to the last stack value (without popping it from the stack)
     * @param {(number|string)} index thee index or local name of the local variable
     * @return {this} the builder itself (chainable method)
     */
    public teeLocal(index: number | string): this { return this.addInstruction(new Instructions.LocalTeeInstruction(this._function.checkLocal(index))); }

    /** Perform an operation on a global variable with the given name
     * @param {string} name the global variable name
     * @param {boolean} [set=false] whether the variable has to be {@link setGlobal set} or {@link getGlobal get}
     * @return {this} the builder itself (chainable method)
     */
    public global(name: string, set: boolean = false): this { return set ? this.setGlobal(name) : this.getGlobal(name); }
    /** Pushes the given global variable value into the stack
     * @param {string} name the global variable name
     * @return {this} the builder itself (chainable method)
     */
    public getGlobal(name: string): this { return this.addInstruction(new Instructions.GlobalGetInstruction(Sections.GlobalVariable.refer(name))); }
    /** Set the given global variable value to the last stack value (popping it from the stack)
     * @param {string} name the global variable name
     * @return {this} the builder itself (chainable method)
     */
    public setGlobal(name: string): this { return this.addInstruction(new Instructions.GlobalSetInstruction(Sections.GlobalVariable.refer(name))); }

    /**Load into the stack the element at the memory index by reading a value of the given type.
     * Reads n consecutives bytes from the given index as a number of the given type, where n is the size of the type.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public load(type: Types.NumberType | Types.NumberTypeKey | NativeTypes, memory?: string): this {
        switch (type) {
            case 'i8': case 'int8': case 'sbyte': return this.load8AsInt32(memory);
            case 'u8': case 'uint8': case 'byte': return this.load8AsUInt32(memory);
            case 'i16': case 'int16': case 'short': return this.load16AsInt32(memory);
            case 'u16': case 'uint16': case 'ushort': return this.load16AsUInt32(memory);
            case Types.Type.i32: case 'i32': case 'int32': case 'uint32': case 'int': case 'uint': return this.loadInt32(memory);
            case Types.Type.i64: case 'i64': case 'int64': case 'uint64': case 'long': case 'ulong': return this.loadInt64(memory);
            case Types.Type.f32: case 'f32': case 'float32': case 'single': return this.loadFloat32(memory);
            case Types.Type.f64: case 'f64': case 'float64': case 'double': return this.loadFloat64(memory);
            default: throw new Error('Unrecognized type: ' + type);
        }
    }
    /**Load into the stack the element at the memory index.
     * Reads 4 consecutives bytes from the given index as a (signed) i32.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public loadInt32(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.I32LoadInstruction.instance); }
    /**Load into the stack the element at the memory index.
     * Reads 8 consecutives bytes from the given index as a (signed) i64.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */   
    public loadInt64(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.I64LoadInstruction.instance); }
    /**Load into the stack the element at the memory index.
     * Reads 1 byte from the given index as a (signed) i32.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public load8AsInt32(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.I32Load8SignedLoadInstruction.instance); }
    /**Load into the stack the element at the memory index.
     * Reads 1 byte from the given index as a (unsigned) i32.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public load8AsUInt32(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.I32Load8UnsignedLoadInstruction.instance); }
    /**Load into the stack the element at the memory index.
     * Reads 2 consecutives bytes from the given index as a (signed) i32.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public load16AsInt32(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.I32Load16SignedLoadInstruction.instance); }
    /**Load into the stack the element at the memory index.
     * Reads 2 consecutives bytes from the given index as a (unsigned) i32.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public load16AsUInt32(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.I32Load16UnsignedLoadInstruction.instance); }
    /**Load into the stack the element at the memory index.
     * Reads 1 byte from the given index as a (signed) i64.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public load8AsInt64(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.I64Load8SignedLoadInstruction.instance); }
    /**Load into the stack the element at the memory index.
     * Reads 1 byte from the given index as a (unsigned) i64.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public load8AsUInt64(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.I64Load8UnsignedLoadInstruction.instance); }
    /**Load into the stack the element at the memory index.
     * Reads 2 consecutive bytes from the given index as a (signed) i64.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public load16AsInt64(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.I64Load16SignedLoadInstruction.instance); }
    /**Load into the stack the element at the memory index.
     * Reads 2 consecutive bytes from the given index as a (unsigned) i64.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public load16AsUInt64(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.I64Load16UnsignedLoadInstruction.instance); }
    /**Load into the stack the element at the memory index.
     * Reads 4 consecutive bytes from the given index as a (signed) i64.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public load32AsInt64(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.I64Load32SignedLoadInstruction.instance); }
    /**Load into the stack the element at the memory index.
     * Reads 4 consecutive bytes from the given index as a (unsigned) i64.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public load32AsUInt64(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.I64Load32UnsignedLoadInstruction.instance); }
    /**Load into the stack the element at the memory index.
     * Reads 4 consecutive bytes from the given index as a f32.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public loadFloat32(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.F32LoadInstruction.instance); }
        /**Load into the stack the element at the memory index.
     * Reads 4 consecutive bytes from the given index as a f64.
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public loadFloat64(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.F64LoadInstruction.instance); }

    /**Pushes on the stack the size (in pages) of the target memory.
     * A page is 64 * 1024 bytes (64KB). 
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public memorySize(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.MemorySizeInstruction.instance); }
    /**Try to grow the current memory page size by the number on the stack.
     * It pushes on the stack the old page size, or `-1` in case of failure (memory limit).
     * A page is 64 * 1024 bytes (64KB). 
     * (assumes the first memory if omitted since there should be only one memory in WASM-v1)
     * @param {string} [memory] the target memory @todo
     * @return {this} the builder itself (chainable method)
     */
    public memoryGrow(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.MemoryGrowInstruction.instance); }
    /** Unsupported @todo */
    public memoryCopy(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.MemoryCopyInstruction.instance); }
    /** Unsupported @todo */
    public memoryFill(memory?: string): this { if (memory) { throw new Error('Not yet implemented'); } return this.addInstruction(Instructions.MemoryFillInstruction.instance); }

    /** Map a type to a function result and execute it
     * @param {Object} mapping the type-function mapping
     * @param {Types.Type|Types.TypesKey} type the given type
     * @param {A} args the arguments to provide to the function
     * @return {this} the builder itself (chainable method)
     */
    protected _discriminate<T extends Types.Type, A extends any[]=[]>(
        mapping: { [key in Types.TypesKey<T>]: (this: this, ...args: A) => this },
        type: T | Types.TypesKey<T>,
        ...args: A
    ): this {
        if (typeof(type) === 'number') { type = Types.Type[type] as Types.TypesKey<T>; }
        if (typeof(mapping[type]) === 'function') { return mapping[type].apply(this, args); }
        throw new Error('Invalid type')
    }

    
    /** Pushes a constant value into the stack
     * @param {bigint} value the constant (literal) value
     * @param {(Types.Type.i64|"i64")} [type] the given type
     * @return {this} the builder itself (chainable method)
     */
    public const(value: bigint, type?: Types.Type.i64 | 'i64'): this;
    /** Pushes a constant value into the stack
     * @param {(number|bigint)} value the constant (literal) value
     * @param {(Types.NumberType|Types.NumberTypeKey)} [type="i32"] the type of the value
     * @return {this} the builder itself (chainable method)
     */
    public const(value: number, type?: Types.NumberType | Types.NumberTypeKey): this;
    public const(value: number | bigint, type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        if (typeof(value) === 'bigint') { type = Types.Type.i64; }
        return this._discriminate<Types.NumberType, [ number ]>({
            i32: this.constInt32, i64: this.constInt64,
            f32: this.constFloat32, f64: this.constFloat64
         }, type, value as number);
    }
    /**Check if the current integer value on the stack is zero.
     * Push 1 if true, 0 if false in the stack (as i32).
     * @param {(Integers|IntegerKeys)} [type="i32"] the type of the value
     * @return {this} the builder itself (chainable method)
     */
    public isZero(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({ i32: this.isZeroInt32, i64: this.isZeroInt64 }, type);
    }
    /**Check if the last two values on the stack are equal.
     * Push 1 if true, 0 if false in the stack (as i32).
     * @param {(Types.NumberType|Types.NumberTypeKey)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public equal(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.equalInt32, i64: this.equalInt64,
            f32: this.equalFloat32, f64: this.equalFloat64
        }, type);
    }
    /**Check if the last two values on the stack are different.
     * Push 1 if true, 0 if false in the stack (as i32).
     * @param {(Types.NumberType|Types.NumberTypeKey)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public notEqual(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.notEqualInt32, i64: this.notEqualInt64,
            f32: this.notEqualFloat32, f64: this.notEqualFloat64
        }, type);
    }
    /**Check if the last two values on the stack are one lesser than the other.
     * Push 1 if true, 0 if false in the stack (as i32).
     * @param {(Types.NumberType|Types.NumberTypeKey)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public lesser(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.lesserInt32, i64: this.lesserInt64,
            f32: this.lesserFloat32, f64: this.lesserFloat64
        }, type);
    }
    /**Check if the last two values on the stack are one greater than the other.
     * Push 1 if true, 0 if false in the stack (as i32).
     * @param {(Types.NumberType|Types.NumberTypeKey)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public greater(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.greaterInt32, i64: this.greaterInt64,
            f32: this.greaterFloat32, f64: this.greaterFloat64
        }, type);
    }
    /**Check if the last two values on the stack are one lesser or equal than the other.
     * Push 1 if true, 0 if false in the stack (as i32).
     * @param {(Types.NumberType|Types.NumberTypeKey)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public lesserEqual(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.lesserEqualInt32, i64: this.lesserEqualInt64,
            f32: this.lesserEqualFloat32, f64: this.lesserEqualFloat64
        }, type);
    }
    /**Check if the last two values on the stack are one greater or equal than the other.
     * Push 1 if true, 0 if false in the stack (as i32).
     * @param {(Types.NumberType|Types.NumberTypeKey)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public greaterEqual(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.greaterEqualInt32, i64: this.greaterEqualInt64,
            f32: this.greaterEqualFloat32, f64: this.greaterEqualFloat64
        }, type);
    }
    /**Add the last two values on the stack and push the result
     * @param {(Types.NumberType|Types.NumberTypeKey)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public add(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.addInt32, i64: this.addInt64,
            f32: this.addFloat32, f64: this.addFloat64
        }, type);
    }
    /**Subtract the last two values on the stack and push the result
     * @param {(Types.NumberType|Types.NumberTypeKey)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public sub(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.subInt32, i64: this.subInt64,
            f32: this.subFloat32, f64: this.subFloat64
        }, type);
    }
    /**Multiply the last two values on the stack and push the result
     * @param {(Types.NumberType|Types.NumberTypeKey)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public mul(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32): this {
        return this._discriminate<Types.NumberType>({
            i32: this.mulInt32, i64: this.mulInt64,
            f32: this.mulFloat32, f64: this.mulFloat64
        }, type);
    }
    /**Divide the last two values on the stack and push the result
     * @param {(Floats|FloatsKeys)} type the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public div(type: Floats | FloatsKeys): this;
    /**Divide the last two values on the stack and push the result
     * @param {(Integers|IntegerKeys)} [type="i32"] the type of the values
     * @param {boolean} [unsigned] whether the values must be intended as unsigned or not
     * @return {this} the builder itself (chainable method)
     */
    public div(type?: Integers | IntegerKeys, unsigned?: boolean): this;
    public div(type: Types.NumberType | Types.NumberTypeKey = Types.Type.i32, unsigned?: boolean): this {
        return this._discriminate<Types.NumberType>({
            i32: unsigned ? this.divUInt32 : this.divInt32,
            i64: unsigned ? this.divUInt64 : this.divInt64,
            f32: this.divFloat32, f64: this.divFloat64
        }, type);
    }

    /**Compute the modulo of the last two values on the stack and push the result
     * @param {(Integers|IntegerKeys)} [type="i32"] the type of the values
     * @param {boolean} [unsigned] whether the values must be intended as unsigned or not
     * @return {this} the builder itself (chainable method)
     */
    public remainder(type: Integers | IntegerKeys = Types.Type.i32, unsigned?: boolean): this {
        return this._discriminate<Integers>({
            i32: unsigned ? this.remainderUInt32 : this.remainderInt32,
            i64: unsigned ? this.remainderUInt64 : this.remainderInt64
        }, type)
    }
    /**Bitwise and between the last two values on the stack and push the result
     * @param {(Integers|IntegersKeys)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public and(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({
            i32: this.andInt32,
            i64: this.andInt64
        }, type)
    }
    /**Bitwise or between the last two values on the stack and push the result
     * @param {(Integers|IntegersKeys)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public or(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({
            i32: this.orInt32,
            i64: this.orInt64
        }, type)
    }
    /**Bitwise xor between the last two values on the stack and push the result
     * @param {(Integers|IntegersKeys)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public xor(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({
            i32: this.xorInt32,
            i64: this.xorInt64
        }, type)
    }
    /**Bitshift left the second last value on the stack by the last value and push the result
     * @param {(Integers|IntegersKeys)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public shiftLeft(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({
            i32: this.shiftLeftInt32,
            i64: this.shiftLeftInt64
        }, type)
    }
    /**Bitshift right the second last value on the stack by the last value and push the result
     * @param {(Integers|IntegersKeys)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public shiftRight(type: Integers | IntegerKeys = Types.Type.i32, unsigned?: boolean): this {
        return this._discriminate<Integers>({
            i32: unsigned ? this.shiftRightUInt32 : this.shiftRightInt32,
            i64: unsigned ? this.shiftRightUInt64 : this.shiftRightInt64
        }, type)
    }
    /**Bitrotate left the second last value on the stack by the last value and push the result
     * @param {(Integers|IntegersKeys)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public rotateLeft(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({
            i32: this.rotateLeftInt32,
            i64: this.rotateLeftInt64
        }, type)
    }
    /**Bitrotate right the second last value on the stack by the last value and push the result
     * @param {(Integers|IntegersKeys)} [type="i32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public rotateRight(type: Integers | IntegerKeys = Types.Type.i32): this {
        return this._discriminate<Integers>({
            i32: this.rotateRightInt32,
            i64: this.rotateRightInt64
        }, type)
    }
    /**Push the absolute value of the last element on the stack
     * @param {(Floats | FloatsKeys)} [type="f32"] the type of the value
     * @return {this} the builder itself (chainable method)
     */
    public abs(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.absFloat32,
            f64: this.absFloat64
        }, type)
    }
    /**Push the negative value of the last element on the stack
     * @param {(Floats | FloatsKeys)} [type="f32"] the type of the value
     * @return {this} the builder itself (chainable method)
     */
    public neg(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.negFloat32,
            f64: this.negFloat64
        }, type)
    }
    /**Push the ceiled value of the last element on the stack
     * @param {(Floats | FloatsKeys)} [type="f32"] the type of the value
     * @return {this} the builder itself (chainable method)
     */
    public ceil(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.ceilFloat32,
            f64: this.ceilFloat64
        }, type)
    }
    /**Push the floored value of the last element on the stack
     * @param {(Floats | FloatsKeys)} [type="f32"] the type of the value
     * @return {this} the builder itself (chainable method)
     */
    public floor(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.floorFloat32,
            f64: this.floorFloat64
        }, type)
    }
    /**Push the truncated value of the last element on the stack (similar to floor)
     * @param {(Floats | FloatsKeys)} [type="f32"] the type of the value
     * @return {this} the builder itself (chainable method)
     */
    public truncate(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.truncateFloat32,
            f64: this.truncateFloat64
        }, type)
    }
    /**Push the rounded value of the last element on the stack
     * @param {(Floats | FloatsKeys)} [type="f32"] the type of the value
     * @return {this} the builder itself (chainable method)
     */
    public nearest(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.nearestFloat32,
            f64: this.nearestFloat64
        }, type)
    }
    /**Push the sqrt value of the last element on the stack
     * @param {(Floats | FloatsKeys)} [type="f32"] the type of the value
     * @return {this} the builder itself (chainable method)
     */
    public sqrt(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.sqrtFloat32,
            f64: this.sqrtFloat64
        }, type)
    }
    /**Push the minimum value between the last two elements on the stack
     * @param {(Floats | FloatsKeys)} [type="f32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public min(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.minFloat32,
            f64: this.minFloat64
        }, type)
    }
    /**Push the maximum value between the last two elements on the stack
     * @param {(Floats | FloatsKeys)} [type="f32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public max(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.maxFloat32,
            f64: this.maxFloat64
        }, type)
    }
    /**Push the sign equality of the last two elements on the stack.
     * If they are equal push 1, otherwise 0 (i32).
     * @param {(Floats | FloatsKeys)} [type="f32"] the type of the values
     * @return {this} the builder itself (chainable method)
     */
    public sign(type: Floats | FloatsKeys = Types.Type.f32): this {
        return this._discriminate<Floats>({
            f32: this.signFloat32,
            f64: this.signFloat64
        }, type)
    }

    /** Pushes one or more i32 constant values into the stack
     * @param {number} value the constant (literal) value
     * @param {...number[]} [values] other constant (literal) values
     * @return {this} the builder itself (chainable method)
     */
    public constInt32(value: number, ...values: number[]): this {
        values.unshift(value);
        return this.addInstruction(...values.map(v => new Instructions.I32ConstInstruction(v)));
    }
    /** Pushes one or more i64 constant values into the stack
     * @param {(number|bigint)} value the constant (literal) value
     * @param {...(number|bigint)[]} [values] other constant (literal) values
     * @return {this} the builder itself (chainable method)
     */
    public constInt64(value: number | bigint, ...values: (number | bigint)[]): this {
        values.unshift(value);
        return this.addInstruction(...values.map(v => new Instructions.I64ConstInstruction(v)));
    }
    /** Pushes one or more f32 constant values into the stack
     * @param {number} value the constant (literal) value
     * @param {...number[]} [values] other constant (literal) values
     * @return {this} the builder itself (chainable method)
     */
    public constFloat32(value: number, ...values: number[]): this {
        values.unshift(value);
        return this.addInstruction(...values.map(v => new Instructions.F32ConstInstruction(v)));
    }
    /** Pushes one or more f64 constant values into the stack
     * @param {number} value the constant (literal) value
     * @param {...number[]} [values] other constant (literal) values
     * @return {this} the builder itself (chainable method)
     */
    public constFloat64(value: number, ...values: number[]): this {
        values.unshift(value);
        return this.addInstruction(...values.map(v => new Instructions.F64ConstInstruction(v)));
    }

    
    /**Check if the current i32 value on the stack is zero.
     * Push 1 if true, 0 if false in the stack (as i32).
     * @return {this} the builder itself (chainable method)
     */
    public isZeroInt32(): this { return this.addInstruction(Instructions.I32EqualZeroInstruction.instance); }
    /**Check if the last two i32 values on the stack are equal.
     * Push 1 if true, 0 if false in the stack (as i32).
     * @return {this} the builder itself (chainable method)
     */
    public equalInt32(): this { return this.addInstruction(Instructions.I32EqualInstruction.instance); }
    /**Check if the last two i32 values on the stack are different.
     * Push 1 if true, 0 if false in the stack (as i32).
     * @return {this} the builder itself (chainable method)
     */
    public notEqualInt32(): this { return this.addInstruction(Instructions.I32NotEqualInstruction.instance); }
    /**Check if the last two i32 values on the stack are one lesser than the other (signed).
     * Push 1 if true, 0 if false in the stack (as i32).
     * @return {this} the builder itself (chainable method)
     */
    public lesserInt32(): this { return this.addInstruction(Instructions.I32LesserSignedInstruction.instance); }
    /**Check if the last two i32 values on the stack are one lesser than the other (unsigned).
     * Push 1 if true, 0 if false in the stack (as i32).
     * @return {this} the builder itself (chainable method)
     */
    public lesserUInt32(): this { return this.addInstruction(Instructions.I32LesserUnsignedInstruction.instance); }
    /**Check if the last two i32 values on the stack are one greater than the other (signed).
     * Push 1 if true, 0 if false in the stack (as i32).
     * @return {this} the builder itself (chainable method)
     */
    public greaterInt32(): this { return this.addInstruction(Instructions.I32GreaterSignedInstruction.instance); }
    /**Check if the last two i32 values on the stack are one greater than the other (unsigned).
     * Push 1 if true, 0 if false in the stack (as i32).
     * @return {this} the builder itself (chainable method)
     */
    public greaterUInt32(): this { return this.addInstruction(Instructions.I32GreaterUnsignedInstruction.instance); }
    /**Check if the last two i32 values on the stack are one lesser or equal than the other (signed).
     * Push 1 if true, 0 if false in the stack (as i32).
     * @return {this} the builder itself (chainable method)
     */
    public lesserEqualInt32(): this { return this.addInstruction(Instructions.I32LesserEqualSignedInstruction.instance); }
    /**Check if the last two i32 values on the stack are one lesser or equal than the other (unsigned).
     * Push 1 if true, 0 if false in the stack (as i32).
     * @return {this} the builder itself (chainable method)
     */
    public lesserEqualUInt32(): this { return this.addInstruction(Instructions.I32LesserEqualUnsignedInstruction.instance); }
    /**Check if the last two i32 values on the stack are one greater or equal than the other (signed).
     * Push 1 if true, 0 if false in the stack (as i32).
     * @return {this} the builder itself (chainable method)
     */
    public greaterEqualInt32(): this { return this.addInstruction(Instructions.I32GreaterEqualSignedInstruction.instance); }
    /**Check if the last two i32 values on the stack are one greater or equal than the other (unsigned).
     * Push 1 if true, 0 if false in the stack (as i32).
     * @return {this} the builder itself (chainable method)
     */
    public greaterEqualUInt32(): this { return this.addInstruction(Instructions.I32GreaterEqualUnsignedInstruction.instance); }
    /**Push on the stack the number of leading zero bits of the last i32 value on the stack.
     * 
     * es: `0b00100010 -> 2`
     * 
     * @return {this} the builder itself (chainable method)
     */
    public leadingZerosUInt32(): this { return this.addInstruction(Instructions.I32LeadingBitsUnsigendInstruction.instance); }
    /**Push on the stack the number of trailing zero bits of the last i32 value on the stack.
     * 
     * es: `0b00100010 -> 1`
     * 
     * @return {this} the builder itself (chainable method)
     */
    public trailingZerosUInt32(): this { return this.addInstruction(Instructions.I32TrailingBitsUnsigendInstruction.instance); }
    /**Push on the stack the number of setted bits of the last i32 value on the stack.
     * 
     * es: `0b00100011 -> 3`
     * 
     * @return {this} the builder itself (chainable method)
     */
    public onesCountInt32(): this { return this.addInstruction(Instructions.I32OnesCountInstruction.instance); }
    /**Add the last two i32 values on the stack and push the result
     * @return {this} the builder itself (chainable method)
     */
    public addInt32(): this { return this.addInstruction(Instructions.I32AddInstruction.instance); }
    /**Subtract the last two i32 values on the stack and push the result
     * @return {this} the builder itself (chainable method)
     */
    public subInt32(): this { return this.addInstruction(Instructions.I32SubtractInstruction.instance); }
    /**Multiply the last two i32 values on the stack and push the result
     * @return {this} the builder itself (chainable method)
     */
    public mulInt32(): this { return this.addInstruction(Instructions.I32MultiplyInstruction.instance); }
    /**Divide the last two values on the stack and push the result.
     * The values are intended as signed.
     * @return {this} the builder itself (chainable method)
     */
    public divInt32(): this { return this.addInstruction(Instructions.I32DivideSignedInstruction.instance); }
    /**Divide the last two values on the stack and push the result.
     * The values are intended as unsigned.
     * @return {this} the builder itself (chainable method)
     */
    public divUInt32(): this { return this.addInstruction(Instructions.I32DivideUnsignedInstruction.instance); }
    /**Compute the modulo of the last two values on the stack and push the result.
     * The values are intended as signed.
     * @return {this} the builder itself (chainable method)
     */
    public remainderInt32(): this { return this.addInstruction(Instructions.I32RemainderSignedInstruction.instance); }
    /**Compute the modulo of the last two values on the stack and push the result.
     * The values are intended as unsigned.
     * @return {this} the builder itself (chainable method)
     */
    public remainderUInt32(): this { return this.addInstruction(Instructions.I32RemainderUnsignedInstruction.instance); }
    /**Bitwise and of the last two i32 values on the stack and push the result
     * @return {this} the builder itself (chainable method)
     */
    public andInt32(): this { return this.addInstruction(Instructions.I32AndInstruction.instance); }
    /**Bitwise or of the last two i32 values on the stack and push the result
     * @return {this} the builder itself (chainable method)
     */
    public orInt32(): this { return this.addInstruction(Instructions.I32OrInstruction.instance); }
    /**Bitwise xor of the last two i32 values on the stack and push the result
     * @return {this} the builder itself (chainable method)
     */
    public xorInt32(): this { return this.addInstruction(Instructions.I32XOrInstruction.instance); }
    /**Bitshift left the second last i32 value on the stack by the last i32 value and push the result
     * @return {this} the builder itself (chainable method)
     */
    public shiftLeftInt32(): this { return this.addInstruction(Instructions.I32BitShifLeftInstruction.instance); }
    /**Bitshift right the second last i32 value on the stack by the last i32 value and push the result.
     * Consider the arguments as signed
     * @return {this} the builder itself (chainable method)
     */
    public shiftRightInt32(): this { return this.addInstruction(Instructions.I32BitShifRightSignedInstruction.instance); }
    /**Bitshift right the second last i32 value on the stack by the last i32 value and push the result
     * Consider the arguments as unsigned
     * @return {this} the builder itself (chainable method)
     */
    public shiftRightUInt32(): this { return this.addInstruction(Instructions.I32BitShifRightUnsignedInstruction.instance); }
    /**Bitrotate left the second last i32 value on the stack by the last i32 value and push the result
     * @return {this} the builder itself (chainable method)
     */
    public rotateLeftInt32(): this { return this.addInstruction(Instructions.I32BitRotationLeftInstruction.instance); }
    /**Bitrotate right the second last i32 value on the stack by the last i32 value and push the result
     * @return {this} the builder itself (chainable method)
     */
    public rotateRightInt32(): this { return this.addInstruction(Instructions.I32BitRotationRightInstruction.instance); }

    /**Check if the current i64 value on the stack is zero.
     * Push 1 if true, 0 if false in the stack (as i32).
     * @return {this} the builder itself (chainable method)
     */
     public isZeroInt64(): this { return this.addInstruction(Instructions.I64EqualZeroInstruction.instance); }
     /**Check if the last two i64 values on the stack are equal.
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
     public equalInt64(): this { return this.addInstruction(Instructions.I64EqualInstruction.instance); }
     /**Check if the last two i64 values on the stack are different.
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
     public notEqualInt64(): this { return this.addInstruction(Instructions.I64NotEqualInstruction.instance); }
     /**Check if the last two i64 values on the stack are one lesser than the other (signed).
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
     public lesserInt64(): this { return this.addInstruction(Instructions.I64LesserSignedInstruction.instance); }
     /**Check if the last two i64 values on the stack are one lesser than the other (unsigned).
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
     public lesserUInt64(): this { return this.addInstruction(Instructions.I64LesserUnsignedInstruction.instance); }
     /**Check if the last two i64 values on the stack are one greater than the other (signed).
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
     public greaterInt64(): this { return this.addInstruction(Instructions.I64GreaterSignedInstruction.instance); }
     /**Check if the last two i64 values on the stack are one greater than the other (unsigned).
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
     public greaterUInt64(): this { return this.addInstruction(Instructions.I64GreaterUnsignedInstruction.instance); }
     /**Check if the last two i64 values on the stack are one lesser or equal than the other (signed).
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
     public lesserEqualInt64(): this { return this.addInstruction(Instructions.I64LesserEqualSignedInstruction.instance); }
     /**Check if the last two i64 values on the stack are one lesser or equal than the other (unsigned).
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
     public lesserEqualUInt64(): this { return this.addInstruction(Instructions.I64LesserEqualUnsignedInstruction.instance); }
     /**Check if the last two i64 values on the stack are one greater or equal than the other (signed).
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
     public greaterEqualInt64(): this { return this.addInstruction(Instructions.I64GreaterEqualSignedInstruction.instance); }
     /**Check if the last two i64 values on the stack are one greater or equal than the other (unsigned).
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
     public greaterEqualUInt64(): this { return this.addInstruction(Instructions.I64GreaterEqualUnsignedInstruction.instance); }
     /**Push on the stack the number of leading zero bits of the last i64 value on the stack.
      * 
      * es: `0b00100010 -> 2`
      * 
      * @return {this} the builder itself (chainable method)
      */
     public leadingZerosUInt64(): this { return this.addInstruction(Instructions.I64LeadingBitsUnsigendInstruction.instance); }
     /**Push on the stack the number of trailing zero bits of the last i64 value on the stack.
      * 
      * es: `0b00100010 -> 1`
      * 
      * @return {this} the builder itself (chainable method)
      */
     public trailingZerosUInt64(): this { return this.addInstruction(Instructions.I64TrailingBitsUnsigendInstruction.instance); }
     /**Push on the stack the number of setted bits of the last i64 value on the stack.
      * 
      * es: `0b00100011 -> 3`
      * 
      * @return {this} the builder itself (chainable method)
      */
     public onesCountInt64(): this { return this.addInstruction(Instructions.I64OnesCountInstruction.instance); }
     /**Add the last two i64 values on the stack and push the result
      * @return {this} the builder itself (chainable method)
      */
     public addInt64(): this { return this.addInstruction(Instructions.I64AddInstruction.instance); }
     /**Subtract the last two i64 values on the stack and push the result
      * @return {this} the builder itself (chainable method)
      */
     public subInt64(): this { return this.addInstruction(Instructions.I64SubtractInstruction.instance); }
     /**Multiply the last two i64 values on the stack and push the result
      * @return {this} the builder itself (chainable method)
      */
     public mulInt64(): this { return this.addInstruction(Instructions.I64MultiplyInstruction.instance); }
     /**Divide the last two values on the stack and push the result.
      * The values are intended as signed.
      * @return {this} the builder itself (chainable method)
      */
     public divInt64(): this { return this.addInstruction(Instructions.I64DivideSignedInstruction.instance); }
     /**Divide the last two values on the stack and push the result.
      * The values are intended as unsigned.
      * @return {this} the builder itself (chainable method)
      */
     public divUInt64(): this { return this.addInstruction(Instructions.I64DivideUnsignedInstruction.instance); }
     /**Compute the modulo of the last two values on the stack and push the result.
      * The values are intended as signed.
      * @return {this} the builder itself (chainable method)
      */
     public remainderInt64(): this { return this.addInstruction(Instructions.I64RemainderSignedInstruction.instance); }
     /**Compute the modulo of the last two values on the stack and push the result.
      * The values are intended as unsigned.
      * @return {this} the builder itself (chainable method)
      */
     public remainderUInt64(): this { return this.addInstruction(Instructions.I64RemainderUnsignedInstruction.instance); }
     /**Bitwise and of the last two i64 values on the stack and push the result
      * @return {this} the builder itself (chainable method)
      */
     public andInt64(): this { return this.addInstruction(Instructions.I64AndInstruction.instance); }
     /**Bitwise or of the last two i64 values on the stack and push the result
      * @return {this} the builder itself (chainable method)
      */
     public orInt64(): this { return this.addInstruction(Instructions.I64OrInstruction.instance); }
     /**Bitwise xor of the last two i64 values on the stack and push the result
      * @return {this} the builder itself (chainable method)
      */
     public xorInt64(): this { return this.addInstruction(Instructions.I64XOrInstruction.instance); }
     /**Bitshift left the second last i64 value on the stack by the last i64 value and push the result
      * @return {this} the builder itself (chainable method)
      */
     public shiftLeftInt64(): this { return this.addInstruction(Instructions.I64BitShifLeftInstruction.instance); }
     /**Bitshift right the second last i64 value on the stack by the last i64 value and push the result.
      * Consider the arguments as signed
      * @return {this} the builder itself (chainable method)
      */
     public shiftRightInt64(): this { return this.addInstruction(Instructions.I64BitShifRightSignedInstruction.instance); }
     /**Bitshift right the second last i64 value on the stack by the last i64 value and push the result
      * Consider the arguments as unsigned
      * @return {this} the builder itself (chainable method)
      */
     public shiftRightUInt64(): this { return this.addInstruction(Instructions.I64BitShifRightUnsignedInstruction.instance); }
     /**Bitrotate left the second last i64 value on the stack by the last i64 value and push the result
      * @return {this} the builder itself (chainable method)
      */
     public rotateLeftInt64(): this { return this.addInstruction(Instructions.I64BitRotationLeftInstruction.instance); }
     /**Bitrotate right the second last i64 value on the stack by the last i64 value and push the result
      * @return {this} the builder itself (chainable method)
      */
     public rotateRightInt64(): this { return this.addInstruction(Instructions.I64BitRotationRightInstruction.instance); }


    /**Check if the last two f32 values on the stack are equal.
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
    public equalFloat32(): this { return this.addInstruction(Instructions.F32EqualInstruction.instance); }
    /**Check if the last two f32 values on the stack are different.
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
    public notEqualFloat32(): this { return this.addInstruction(Instructions.F32NotEqualInstruction.instance); }
    /**Check if the last two f32 values on the stack are one lesser than the other.
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
    public lesserFloat32(): this { return this.addInstruction(Instructions.F32LesserInstruction.instance); }
    /**Check if the last two f32 values on the stack are one greater than the other.
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
    public greaterFloat32(): this { return this.addInstruction(Instructions.F32GreaterInstruction.instance); }
    /**Check if the last two f32 values on the stack are one lesser or equal than the other.
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
    public lesserEqualFloat32(): this { return this.addInstruction(Instructions.F32LesserEqualInstruction.instance); }
    /**Check if the last two f32 values on the stack are one greater or equal than the other.
      * Push 1 if true, 0 if false in the stack (as i32).
      * @return {this} the builder itself (chainable method)
      */
    public greaterEqualFloat32(): this { return this.addInstruction(Instructions.F32GreaterEqualInstruction.instance); }
    /**Push the absolute value of the last f32 element on the stack
     * @return {this} the builder itself (chainable method)
     */
    public absFloat32(): this { return this.addInstruction(Instructions.F32AbsoluteInstruction.instance); }
    /**Push the negative value of the last f32 element on the stack
     * @return {this} the builder itself (chainable method)
     */
    public negFloat32(): this { return this.addInstruction(Instructions.F32NegativeInstruction.instance); }
    /**Push the ceiled value of the last f32 element on the stack
     * @return {this} the builder itself (chainable method)
     */
    public ceilFloat32(): this { return this.addInstruction(Instructions.F32CeilInstruction.instance); }
    /**Push the floored value of the last f32 element on the stack
     * @return {this} the builder itself (chainable method)
     */
    public floorFloat32(): this { return this.addInstruction(Instructions.F32FloorInstruction.instance); }
    /**Push the truncated value of the last f32 element on the stack (simliar to floor)
     * @return {this} the builder itself (chainable method)
     */
    public truncateFloat32(): this { return this.addInstruction(Instructions.F32TruncateInstruction.instance); }
    /**Push the rounded value of the last f32 element on the stack
     * @return {this} the builder itself (chainable method)
     */
    public nearestFloat32(): this { return this.addInstruction(Instructions.F32NearestInstruction.instance); }
    /**Push the sqrt value of the last f32 element on the stack
     * @return {this} the builder itself (chainable method)
     */
    public sqrtFloat32(): this { return this.addInstruction(Instructions.F32SquareRootInstruction.instance); }
    /**Add the last two f32 values on the stack and push the result
     * @return {this} the builder itself (chainable method)
     */
    public addFloat32(): this { return this.addInstruction(Instructions.F32AddInstruction.instance); }
    /**Subtract the last two f32 values on the stack and push the result
     * @return {this} the builder itself (chainable method)
     */
    public subFloat32(): this { return this.addInstruction(Instructions.F32SubtractInstruction.instance); }
    /**Multiply the last two f32 values on the stack and push the result
     * @return {this} the builder itself (chainable method)
     */
    public mulFloat32(): this { return this.addInstruction(Instructions.F32MultiplyInstruction.instance); }
    /**Divide the last two f32 values on the stack and push the result
     * @return {this} the builder itself (chainable method)
     */
    public divFloat32(): this { return this.addInstruction(Instructions.F32DivideInstruction.instance); }
    /**Push the minimum of the last two f32 values on the stack
     * @return {this} the builder itself (chainable method)
     */
    public minFloat32(): this { return this.addInstruction(Instructions.F32MinInstruction.instance); }
    /**Push the maximum of the last two f32 values on the stack
     * @return {this} the builder itself (chainable method)
     */
    public maxFloat32(): this { return this.addInstruction(Instructions.F32MaxInstruction.instance); }
    /**Check if the last two f32 values on the stack share the same sign.
     * If they are equal push 1, otherwise 0 (i32).
     * @return {this} the builder itself (chainable method)
     */
    public signFloat32(): this { return this.addInstruction(Instructions.F32CopySignInstruction.instance); }

    /**Check if the last two f64 values on the stack are equal.
      * Push 1 if true, 0 if false in the stack (as i64).
      * @return {this} the builder itself (chainable method)
      */
     public equalFloat64(): this { return this.addInstruction(Instructions.F64EqualInstruction.instance); }
     /**Check if the last two f64 values on the stack are different.
       * Push 1 if true, 0 if false in the stack (as i64).
       * @return {this} the builder itself (chainable method)
       */
     public notEqualFloat64(): this { return this.addInstruction(Instructions.F64NotEqualInstruction.instance); }
     /**Check if the last two f64 values on the stack are one lesser than the other.
       * Push 1 if true, 0 if false in the stack (as i64).
       * @return {this} the builder itself (chainable method)
       */
     public lesserFloat64(): this { return this.addInstruction(Instructions.F64LesserInstruction.instance); }
     /**Check if the last two f64 values on the stack are one greater than the other.
       * Push 1 if true, 0 if false in the stack (as i64).
       * @return {this} the builder itself (chainable method)
       */
     public greaterFloat64(): this { return this.addInstruction(Instructions.F64GreaterInstruction.instance); }
     /**Check if the last two f64 values on the stack are one lesser or equal than the other.
       * Push 1 if true, 0 if false in the stack (as i64).
       * @return {this} the builder itself (chainable method)
       */
     public lesserEqualFloat64(): this { return this.addInstruction(Instructions.F64LesserEqualInstruction.instance); }
     /**Check if the last two f64 values on the stack are one greater or equal than the other.
       * Push 1 if true, 0 if false in the stack (as i64).
       * @return {this} the builder itself (chainable method)
       */
     public greaterEqualFloat64(): this { return this.addInstruction(Instructions.F64GreaterEqualInstruction.instance); }
     /**Push the absolute value of the last f64 element on the stack
      * @return {this} the builder itself (chainable method)
      */
     public absFloat64(): this { return this.addInstruction(Instructions.F64AbsoluteInstruction.instance); }
     /**Push the negative value of the last f64 element on the stack
      * @return {this} the builder itself (chainable method)
      */
     public negFloat64(): this { return this.addInstruction(Instructions.F64NegativeInstruction.instance); }
     /**Push the ceiled value of the last f64 element on the stack
      * @return {this} the builder itself (chainable method)
      */
     public ceilFloat64(): this { return this.addInstruction(Instructions.F64CeilInstruction.instance); }
     /**Push the floored value of the last f64 element on the stack
      * @return {this} the builder itself (chainable method)
      */
     public floorFloat64(): this { return this.addInstruction(Instructions.F64FloorInstruction.instance); }
     /**Push the truncated value of the last f64 element on the stack (simliar to floor)
      * @return {this} the builder itself (chainable method)
      */
     public truncateFloat64(): this { return this.addInstruction(Instructions.F64TruncateInstruction.instance); }
     /**Push the rounded value of the last f64 element on the stack
      * @return {this} the builder itself (chainable method)
      */
     public nearestFloat64(): this { return this.addInstruction(Instructions.F64NearestInstruction.instance); }
     /**Push the sqrt value of the last f64 element on the stack
      * @return {this} the builder itself (chainable method)
      */
     public sqrtFloat64(): this { return this.addInstruction(Instructions.F64SquareRootInstruction.instance); }
     /**Add the last two f64 values on the stack and push the result
      * @return {this} the builder itself (chainable method)
      */
     public addFloat64(): this { return this.addInstruction(Instructions.F64AddInstruction.instance); }
     /**Subtract the last two f64 values on the stack and push the result
      * @return {this} the builder itself (chainable method)
      */
     public subFloat64(): this { return this.addInstruction(Instructions.F64SubtractInstruction.instance); }
     /**Multiply the last two f64 values on the stack and push the result
      * @return {this} the builder itself (chainable method)
      */
     public mulFloat64(): this { return this.addInstruction(Instructions.F64MultiplyInstruction.instance); }
     /**Divide the last two f64 values on the stack and push the result
      * @return {this} the builder itself (chainable method)
      */
     public divFloat64(): this { return this.addInstruction(Instructions.F64DivideInstruction.instance); }
     /**Push the minimum of the last two f64 values on the stack
      * @return {this} the builder itself (chainable method)
      */
     public minFloat64(): this { return this.addInstruction(Instructions.F64MinInstruction.instance); }
     /**Push the maximum of the last two f64 values on the stack
      * @return {this} the builder itself (chainable method)
      */
     public maxFloat64(): this { return this.addInstruction(Instructions.F64MaxInstruction.instance); }
     /**Check if the last two f64 values on the stack share the same sign.
      * If they are equal push 1, otherwise 0 (i64).
      * @return {this} the builder itself (chainable method)
      */
     public signFloat64(): this { return this.addInstruction(Instructions.F64CopySignInstruction.instance); }

    /** Convert a number from a type to another
     * @param {(0x08|"i8")} source the source type (byte)
     * @param {(Integers|IntegerKeys)} destination destination type
     * @return {this} the builder itself (chainable method)
     */
    public convert(source: 0x08 | 'i8', destination: Integers | IntegerKeys): this;
    /** Convert a number from a type to another
     * @param {(0x10|"i16")} source the source type (short)
     * @param {(Integers|IntegerKeys)} destination destination type
     * @return {this} the builder itself (chainable method)
     */
    public convert(source: 0x10 | 'i16', destination: Integers | IntegerKeys): this;
    /** Convert a number from a type to another
     * @param {(Types.Type.i32|"i32")} source the source type
     * @param {(Floats|FloatsKeys|Types.Type.i64|"i64")} destination destination type
     * @param {{ unsigned?: boolean }} [options] options for the conversion (threat the argument as signed/unsigned)
     * @return {this} the builder itself (chainable method)
     */
    public convert(
        source: Types.Type.i32 | 'i32',
        destination: Floats | FloatsKeys | Types.Type.i64 | 'i64',
        options?: { unsigned?: boolean }
    ): this;
    /** Convert a number from a type to another
     * @param {(Types.Type.i64 | "i64")} source the source type
     * @param {(Types.Type.i32 |"i32")} destination destination type
     * @return {this} the builder itself (chainable method)
     */
    public convert(
        source: Types.Type.i64 | 'i64',
        destination: Types.Type.i32 |'i32'
    ): this;
    /** Convert a number from a type to another
     * @param {(Types.Type.i64 | "i64")} source the source type
     * @param {(Floats | FloatsKeys)} destination destination type
     * @param {{ unsigned?: boolean }} [options] options for the conversion (threat the argument as signed/unsigned)
     * @return {this} the builder itself (chainable method)
     */
    public convert(
        source: Types.Type.i64 | 'i64',
        destination: Floats | FloatsKeys,
        options?: { unsigned?: boolean }
    ): this;
    /** Convert a number from a type to another
     * @param {(Types.Type.f32 | "f32")} source the source type
     * @param {(Types.Type.i32 | "i32")} destination destination type
     * @return {this} the builder itself (chainable method)
     */
    public convert(
        source: Types.Type.f32 | 'f32',
        destination: Types.Type.f64 | 'f64'
    ): this;
    /** Convert a number from a type to another
     * @param {(Types.Type.f32 | "f32")} source the source type
     * @param {(Types.Type.i32 | "i32")} destination destination type
     * @param {{ unsigned?: boolean, mode?: "truncate" | "saturate" }} [options]
     *      options for the conversion:
     * - threat the argument as signed/unsigned
     * - use truncation/saturation
     * @return {this} the builder itself (chainable method)
     */
    public convert(
        source: Types.Type.f32 | 'f32',
        destination: Types.Type.i32 | 'i32',
        options?: { unsigned: boolean, mode?: 'truncate' | 'saturate' }
    ): this;
    /** Convert a number from a type to another
     * @param {(Types.Type.f32 | "f32")} source the source type
     * @param {(Types.Type.i32 | "i32")} destination destination type
     * @param {{ unsigned?: boolean, mode?: "truncate" | "saturate" | "reinterpret" }} [options]
     *      options for the conversion (use truncation/saturation/(btis) reinterpretation)
     * @return {this} the builder itself (chainable method)
     */
    public convert(
        source: Types.Type.f32 | 'f32',
        destination: Types.Type.i32 | 'i32',
        options?: { mode?: 'reinterpret' | 'truncate' | 'saturate' }
    ): this;
    /** Convert a number from a type to another
     * @param {(Types.Type.f32 | "f32")} source the source type
     * @param {(Types.Type.i64 | "i64")} destination destination type
     * @param {{ mode?: "truncate" | "saturate" }} [options]
     *      options for the conversion (use truncation/saturation)
     * @return {this} the builder itself (chainable method)
     */
    public convert(
        source: Types.Type.f32 | 'f32',
        destination: Types.Type.i64 | 'i64',
        options?: { mode?: 'truncate' | 'saturate' }
    ): this;
    /** Convert a number from a type to another
     * @param {(Types.Type.f64 | "f64")} source the source type
     * @param {(Types.Type.f32 | "f32")} destination destination type
     * @return {this} the builder itself (chainable method)
     */
    public convert(
        source: Types.Type.f64 | 'f64',
        destination: Types.Type.f32 | 'f32'
    ): this;
    /** Convert a number from a type to another
     * @param {(Types.Type.f64 | "f64")} source the source type
     * @param {(Types.Type.i32 | "i32")} destination destination type
     * @param {{ unsigned?: boolean, mode?: "truncate" | "saturate" }} [options]
     *      options for the conversion (use truncation/saturation)
     * @return {this} the builder itself (chainable method)
     */
    public convert(
        source: Types.Type.f64 | 'f64',
        destination: Types.Type.i32 | 'i32',
        options?: { mode?: 'truncate' | 'saturate' }
    ): this;
    /** Convert a number from a type to another
     * @param {(Types.Type.f64 | "f64")} source the source type
     * @param {(Types.Type.i64 | "i64")} destination destination type
     * @param {{ mode?: "truncate" | "saturate" | "reinterpret" }} [options]
     *      options for the conversion (use truncation/saturation/(btis) reinterpretation)
     * @return {this} the builder itself (chainable method)
     */
    public convert(
        source: Types.Type.f64 | 'f64',
        destination: Types.Type.i64 | 'i64',
        options?: { mode?: 'reinterpret' | 'truncate' | 'saturate' }
    ): this;
    /** Convert a number from a type to another
     * @param {(0x08 | "i8" | 0x10 | "i16" | Types.NumberType | Types.NumberTypeKey)} source the source type
     * @param {(Types.NumberType | Types.NumberTypeKey)} destination destination type
     * @param {{ unsigned?: boolean, mode?: "truncate" | "saturate" }} [options]
     *      options for the conversion:
     * - threat the argument as signed/unsigned
     * - use truncation/saturation/(bits) reinterpretation
     * @return {this} the builder itself (chainable method)
     */
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

    /**Threat an i32 as a signed i8 and extends again to i32,
     * propagating the sign bit to the new bit-length.
     * Only low bits are considered (0xff)
     * @return {this} the builder itself (chainable method)
     */
    public extendInt8ToInt32(): this { return this.addInstruction(Instructions.I32Extend8SignedInstruction.instance); }
    /**Threat an i64 as a signed i8 and extends again to i64,
     * propagating the sign bit to the new bit-length.
     * Only low bits are considered (0xff)
     * @return {this} the builder itself (chainable method)
     */
    public extendInt8ToInt64(): this { return this.addInstruction(Instructions.I64Extend8SignedInstruction.instance); }

    /**Threat an i32 as a signed i16 and extends again to i32,
     * propagating the sign bit to the new bit-length.
     * Only low bits are considered (0xffff)
     * @return {this} the builder itself (chainable method)
     */
    public extendInt16ToInt32(): this { return this.addInstruction(Instructions.I32Extend16SignedInstruction.instance); }
    
    /**Threat an i64 as a signed i16 and extends again to i64,
     * propagating the sign bit to the new bit-length.
     * Only low bits are considered (0xffff)
     * @return {this} the builder itself (chainable method)
     */
    public extendInt16ToInt64(): this { return this.addInstruction(Instructions.I64Extend16SignedInstruction.instance); }
    
    /**Threat an i64 as a signed i32 and extends again to i64,
     * propagating the sign bit to the new bit-length.
     * Only low bits are considered (0xffffffff)
     * @return {this} the builder itself (chainable method)
     *  */
    public extendInt32ToInt64(): this { return this.addInstruction(Instructions.I64Extend32SignedInstruction.instance); }
    /**Threat an i64 as a unsigned i32 and extends again to i64,
     * propagating the sign bit to the new bit-length.
     * Only low bits are considered (0xffffffff)
     * @return {this} the builder itself (chainable method)
     *  */
    public extendUInt32ToInt64(): this { return this.addInstruction(Instructions.I64ExtendI32UnsignedInstruction.instance); }
    /**Convert a signed i32 to a f32
     * @return {this} the builder itself (chainable method)
     */
    public int32ToFloat32(): this { return this.addInstruction(Instructions.F32ConvertI32SignedInstruction.instance); }
    /**Convert an unsigned i32 to a f32
     * @return {this} the builder itself (chainable method)
     */
    public uint32ToFloat32(): this { return this.addInstruction(Instructions.F32ConvertI32UnsignedInstruction.instance); }
    /**Convert a signed i32 to a f64
     * @return {this} the builder itself (chainable method)
     */
    public int32ToFloat64(): this { return this.addInstruction(Instructions.F64ConvertI32SignedInstruction.instance); }
    /**Convert an unsigned i32 to a f64
     * @return {this} the builder itself (chainable method)
     */
    public uint32ToFloat64(): this { return this.addInstruction(Instructions.F64ConvertI32UnsignedInstruction.instance); }
    
    /**Wrap a i64 to a i32 (modulo 2^32)
     * @return {this} the builder itself (chainable method)
     */
    public wrapInt64InInt32(): this { return this.addInstruction(Instructions.I32WrapI64Instruction.instance); }
    /**Convert a signed i64 to a f32
     * @return {this} the builder itself (chainable method)
     */
    public int64ToFloat32(): this { return this.addInstruction(Instructions.F32ConvertI64SignedInstruction.instance); }
    /**Convert an unsigned i64 to a f32
     * @return {this} the builder itself (chainable method)
     */
    public uint64ToFloat32(): this { return this.addInstruction(Instructions.F32ConvertI64UnsignedInstruction.instance); }
    /**Convert a signed i64 to a f64
     * @return {this} the builder itself (chainable method)
     */
    public int64ToFloat64(): this { return this.addInstruction(Instructions.F64ConvertI64SignedInstruction.instance); }
    /**Convert an unsigned i64 to a f64
     * @return {this} the builder itself (chainable method)
     */
    public uint64ToFloat64(): this { return this.addInstruction(Instructions.F64ConvertI64UnsignedInstruction.instance); }

    /**Promote a f32 to a f64 (increasing precision)
     * @return {this} the builder itself (chainable method)
     */
    public promoteFloat32(): this { return this.addInstruction(Instructions.F64PromoteF32Instruction.instance); }
    /**Reinterpret bits of a f32 as a i32
     * @return {this} the builder itself (chainable method)
     */
    public float32AsInt32(): this { return this.addInstruction(Instructions.I32ReinterpretF32Instruction.instance); }
    /** Truncate a f32 to a signed i32
     * @return {this} the builder itself (chainable method)
     */
    public truncateFloat32ToInt32(): this { return this.addInstruction(Instructions.I32TruncateF32SignedInstruction); }
    /** Truncate a f32 to an unsigned i32
     * @return {this} the builder itself (chainable method)
     */
    public truncateFloat32ToUInt32(): this { return this.addInstruction(Instructions.I32TruncateF32UnsignedInstruction); }
    /** Truncate a f32 to a signed i64
     * @return {this} the builder itself (chainable method)
     */
    public truncateFloat32ToInt64(): this { return this.addInstruction(Instructions.I64TruncateF32SignedInstruction.instance); }
    /** Truncate a f32 to an unsigned i64
     * @return {this} the builder itself (chainable method)
     */
    public truncateFloat32ToUInt64(): this { return this.addInstruction(Instructions.I64TruncateF32UnsignedInstruction.instance); }
    /** Truncate with saturation a f32 to a signed i32.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i32 value on negative/positive overflow
     * - NaN is converted to 0
     * @return {this} the builder itself (chainable method)
     */
    public saturateFloat32ToInt32(): this { return this.addInstruction(Instructions.I32TruncateSaturationF32SignedInstruction); }
    /** Truncate with saturation a f32 to an unsigned i32.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i32 value on negative/positive overflow
     * - NaN is converted to 0
     * @return {this} the builder itself (chainable method)
     */
    public saturateFloat32ToUInt32(): this { return this.addInstruction(Instructions.I32TruncateSaturationF32UnsignedInstruction); }
    /** Truncate with saturation a f32 to a signed i64.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i64 value on negative/positive overflow
     * - NaN is converted to 0
     * @return {this} the builder itself (chainable method)
     */
    public saturateFloat32ToInt64(): this { return this.addInstruction(Instructions.I64TruncateSaturationF32SignedInstruction); }
    /** Truncate with saturation a f32 to an unsigned i64.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i64 value on negative/positive overflow
     * - NaN is converted to 0
     * @return {this} the builder itself (chainable method)
     */
    public saturateFloat32ToUInt64(): this { return this.addInstruction(Instructions.I64TruncateSaturationF32UnsignedInstruction); }
    
    
    /**Demote a f64 to a f32 (loosing precision)
     * @return {this} the builder itself (chainable method)
     */
    public demoteFloat64(): this { return this.addInstruction(Instructions.F32DemoteF64Instruction.instance); }
    /**Reinterpret bits of a f64 as a i64
     * @return {this} the builder itself (chainable method)
     */
    public float64AsInt64(): this { return this.addInstruction(Instructions.I64ReinterpretF64Instruction.instance); }
    /** Truncate a f64 to a signed i32
     * @return {this} the builder itself (chainable method)
     */
    public truncateFloat64ToInt32(): this { return this.addInstruction(Instructions.I32TruncateF64SignedInstruction); }
    /** Truncate a f64 to an unsigned i32
     * @return {this} the builder itself (chainable method)
     */
    public truncateFloat64ToUInt32(): this { return this.addInstruction(Instructions.I32TruncateF64UnsignedInstruction); }
    /** Truncate a f64 to a signed i64
     * @return {this} the builder itself (chainable method)
     */
    public truncateFloat64ToInt64(): this { return this.addInstruction(Instructions.I64TruncateF64SignedInstruction.instance); }
    /** Truncate a f64 to an unsigned i64
     * @return {this} the builder itself (chainable method)
     */
    public truncateFloat64ToUInt64(): this { return this.addInstruction(Instructions.I64TruncateF64UnsignedInstruction.instance); }
    /** Truncate with saturation a f64 to a signed i32.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i32 value on negative/positive overflow
     * - NaN is converted to 0
     * @return {this} the builder itself (chainable method)
     */
    public saturateFloat64ToInt32(): this { return this.addInstruction(Instructions.I32TruncateSaturationF64SignedInstruction); }
    /** Truncate with saturation a f64 to an unsigned i32.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i32 value on negative/positive overflow
     * - NaN is converted to 0
     * @return {this} the builder itself (chainable method)
     */
    public saturateFloat64ToUInt32(): this { return this.addInstruction(Instructions.I32TruncateSaturationF64UnsignedInstruction); }
    /** Truncate with saturation a f64 to a signed i64.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i64 value on negative/positive overflow
     * - NaN is converted to 0
     * @return {this} the builder itself (chainable method)
     */
    public saturateFloat64ToInt64(): this { return this.addInstruction(Instructions.I64TruncateSaturationF64SignedInstruction); }
    /** Truncate with saturation a f64 to an unsigned i64.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i64 value on negative/positive overflow
     * - NaN is converted to 0
     * @return {this} the builder itself (chainable method)
     */
    public saturateFloat64ToUInt64(): this { return this.addInstruction(Instructions.I64TruncateSaturationF64UnsignedInstruction); }

    public build(): Instructions.Expression { return new Instructions.Expression(this._instructions); }
}