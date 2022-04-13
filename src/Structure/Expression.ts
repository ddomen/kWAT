import { protect } from '../internal';
import { OpCodes, OpCodesExt1, OpCodesExt2 } from '../OpCodes';
import * as Types from './Types';
import * as Sections from './Sections';
import type { IEncodable, IDecodable, IDecoder, IEncoder } from './Encoder';
import type { Module } from './Module';

export class Expression implements IEncodable<Module> {

    public readonly Instructions!: Instruction[];
    
    public constructor(instructions: Instruction[]=[]) {
        protect(this, 'Instructions', instructions.slice(), true);
    }

    public getDefinedTypes(): Types.FunctionType[] {
        return this.Instructions
                    .filter(i => i instanceof AbstractBlockInstruction)
                    .map(i => (i as AbstractBlockInstruction).getDefinedTypes())
                    .reduce((a, v) => (a.push(...v), a), []);
    }

    public getDefinedGlobals(): Sections.GlobalVariable[] {
        let r = this.Instructions
                    .filter(i => i instanceof GlobalVariableInstruction)
                    .map(g => (g as GlobalVariableInstruction).Variable);
        r.push(
            ...this.Instructions
                    .filter(i => i instanceof AbstractBlockInstruction)
                    .map(i => (i as AbstractBlockInstruction).getDefinedGlobals())
                    .reduce((a, v) => (a.push(...v), a), [])
        );
        return r;
    }

    public encode(encoder: IEncoder, context: Module): void {
        encoder
            .array(this.Instructions, { module: context, blocks: [] })
            .uint8(OpCodes.end);
    }

    public evaluate(params: Types.ResultType): Passable<undefined, Types.ResultType>;
    public evaluate<B extends boolean>(params: Types.ResultType, pass: B): Passable<B, Types.ResultType>;
    public evaluate(params: Types.ResultType, pass?: boolean): Passable<typeof pass, Types.ResultType>;
    public evaluate(params: Types.ResultType, pass?: boolean): Passable<typeof pass, Types.ResultType> {
        return Instruction.resolveStack(this.Instructions, params, pass);
    }
    
    public static decode(decoder: IDecoder, context: Module): Expression {
        let exp = new Expression();
        while (decoder.peek() != OpCodes.end) {
            exp.Instructions.push(Instruction.decode(decoder, { module: context, blocks: [] }));
        }
        decoder.uint8();
        return exp;
    }
}

export type Passable<T extends boolean | undefined, R> = R | (T extends false | undefined ? never : null);
export type Ext1Instruction<O extends OpCodesExt1=OpCodesExt1> = Instruction<OpCodes.op_extension_1> & { OperationCode: O };
export type Ext2Instruction<O extends OpCodesExt2=OpCodesExt2> = Instruction<OpCodes.op_extension_2> & { OperationCode: O };

type Instructible<O extends OpCodes=OpCodes> = { instance: Instruction<O> } | IDecodable<Instruction<O>, [ ExpressionContext ]>;
type Ext1Instructible<O extends OpCodesExt1=OpCodesExt1> = { instance: Ext1Instruction<O> } | IDecodable<Ext1Instruction<O>, [ ExpressionContext ]>;
type Ext2Instructible<O extends OpCodesExt2=OpCodesExt2> = { instance: Ext2Instruction<O> } | IDecodable<Ext2Instruction<O>, [ ExpressionContext ]>;
type ExpressionContext = { module: Module, blocks: AbstractBlockInstruction[] };
type Ctor<I extends Instruction, Args extends any[]=[]> = { new(...args: Args): I };
type StackEdit = [ (Types.ValueType | null)[], (Types.ValueType | { ref: number })[] ];
type DefiniteStackEdit = [ Types.Stack, Types.Stack ];

export abstract class Instruction<O extends OpCodes=OpCodes> implements IEncodable<ExpressionContext> {
    public readonly Code!: O;
    public get stack(): StackEdit { return [ [], [] ]; }
    protected constructor(code: O) { protect(this, 'Code', code, true); }
    public getIndex(expression: Expression, pass?: boolean): number {
        let index = expression.Instructions.indexOf(this);
        if (!pass && index < 0) { throw new Error('Instruction not present in the current expression'); }
        return index;
    }
    public encode(encoder: IEncoder, _: ExpressionContext): void { encoder.uint8(this.Code); }

    public evaluate(stack: Types.Stack): Passable<undefined, Types.ResultType>;
    public evaluate<B extends boolean>(stack: Types.Stack, pass: B): Passable<B, Types.ResultType>;
    public evaluate(stack: Types.Stack, pass?: boolean): Passable<typeof pass, Types.ResultType>;
    public evaluate(stack: Types.Stack, pass?: boolean): Passable<typeof pass, Types.ResultType> {
        if (!Array.isArray(stack)) { throw new TypeError('First argument must be a ResultType (Array<ValueType>)'); }
        let wrong!: [number, number];
        if (stack.some((n, i) => (wrong = [n, i], !Types.validValue(n)))) {
            throw new TypeError('Invalid ValueType in params: 0x' + Number(wrong[0]).toString(16) + ' (index: ' + wrong[1] + ')');
        }
        let stackEdit = this.stack;
        let stackOp = stack.slice();
        let result: Types.ResultType | null = null;
        let typeStack: Types.ValueType[] = [];
        if (stackEdit[0].every(s => {
            const c = stackOp.pop();
            if (typeof(c) === 'undefined') { return false; }
            if (c === s) { return true; }
            if (s === null) { typeStack.push(c); return true; }
            return false;
        })) {
            stackOp.push(...stackEdit[1].map(x => typeof(x) === 'object' ? typeStack[x.ref]! : x));
            result = stackOp;
        }
        if (!pass && !result) {
            throw new Error(
                'Can not resolve stack for ' + this.constructor.name +
                ' current stack: [' + stack.map(s => Types.Type[s]).join(', ') + ']' +
                ' instruction edit: [' + (stackEdit[0] || []).map(s => typeof(s) === 'object' ? '?' : Types.Type[s]) + '] -> [' +
                (stackEdit[1] || []).map(s => typeof(s) === 'object' ? '?' : Types.Type[s]) + ']'
            );
        }
        return result;
    }

    private static readonly _instructionSet: { [key in OpCodes]?: Instructible } = { };
    private static readonly _ext1Set: { [key in OpCodesExt1]?: Ext1Instructible } = { };
    private static readonly _ext2Set: { [key in OpCodesExt2]?: Ext2Instructible } = { };

    public static registerInstruction<O extends Exclude<OpCodes, OpCodes.op_extension_1>>(this: Instructible<O>, key: O): void;
    public static registerInstruction<O extends OpCodesExt1>(this: Ext1Instructible<O>, key: OpCodes.op_extension_1, forward: O): void;
    public static registerInstruction<O extends OpCodesExt2>(this: Ext2Instructible<O>, key: OpCodes.op_extension_2, forward: O): void;
    public static registerInstruction(this: Instructible | Ext1Instructible, key: OpCodes, forward?: OpCodesExt1): void {
        if (key === OpCodes.op_extension_1) {
            if (!((typeof(forward) === 'undefined' ? -1 : forward) in OpCodesExt1)) { throw new Error('Invalid forward code 0x' + Number(forward).toString(16)); }
            Instruction._ext1Set[forward!] = this as Ext1Instructible;
        }
        else if (key === OpCodes.op_extension_2) {
            if (!((typeof(forward) === 'undefined' ? -1 : forward) in OpCodesExt2)) { throw new Error('Invalid forward code 0x' + Number(forward).toString(16)); }
            Instruction._ext2Set[forward!] = this as Ext2Instructible;
        }
        else if (!(key in OpCodes)) { throw new Error('Invalid opcode 0x' + Number(key).toString(16)); }
        else { Instruction._instructionSet[key] = this as Instructible; }
    }
    public static decode(decoder: IDecoder, context: ExpressionContext): Instruction {
        let code: OpCodes = decoder.uint8(), fwd: OpCodesExt1 | OpCodesExt2 = -1, ctor;
        if (code === OpCodes.op_extension_1) { ctor = Instruction._ext1Set[(fwd = decoder.uint32() as OpCodesExt1)]; }
        else if (code === OpCodes.op_extension_2) { ctor = Instruction._ext2Set[(fwd = decoder.uint32() as OpCodesExt2)]; }
        else { ctor = Instruction._instructionSet[code]; }
        if (!ctor) { throw new Error('Unsupported Instruction code: 0x' + Number(code).toString(16) + (fwd >= 0 ? ' 0x' + Number(fwd).toString(16) : '')); }
        if ('instance' in ctor && ctor.instance instanceof Instruction) { return ctor.instance; }
        else if ('decode' in ctor && typeof(ctor.decode) === 'function') { return ctor.decode(decoder, context); }
        else { throw new Error('Unsupported Instruction code: 0x' + Number(code).toString(16) + (fwd >= 0 ? ' 0x' + Number(fwd).toString(16) : '')); }
    }
    public static resolveStack(instructions: Instruction[], params: Types.ResultType): Passable<undefined, Types.ResultType>
    public static resolveStack<B extends boolean>(instructions: Instruction[], params: Types.ResultType, pass: B): Passable<B, Types.ResultType>
    public static resolveStack(instructions: Instruction[], params: Types.ResultType, pass?: boolean): Passable<typeof pass, Types.ResultType>
    public static resolveStack(instructions: Instruction[], params: Types.ResultType, pass?: boolean): Passable<typeof pass, Types.ResultType> {
        if (!Array.isArray(instructions) || instructions.some(i => !(i instanceof Instruction))) {
            throw new TypeError('Invalid argument: first argument must be an Array<Instruction>');
        }
        if (!instructions.length) { return params; }
        let curr: Types.ResultType | null = params;
        for (let instr of instructions) {
            curr = instr.evaluate(curr, pass);
            if (!curr) { break; }
        } 
        return curr;
    }

    public static checkStack(instructions: Instruction[], stack: DefiniteStackEdit): boolean;
    public static checkStack(instructions: Instruction[], signature: Types.FunctionType): boolean;
    public static checkStack(instructions: Instruction[], params: Types.ResultType, results: Types.ResultType): boolean;
    public static checkStack(instructions: Instruction[], stack: DefiniteStackEdit | Types.ResultType | Types.FunctionType, results?: Types.ResultType): boolean {
        if (stack instanceof Types.FunctionType) { stack = [ stack.Parameters, stack.Results ]; }
        else if (Array.isArray(results)) { stack = [ stack as Types.ResultType, results ]; }
        if (!Array.isArray(stack)) { throw new TypeError('Invalid argument: second argument must be of type Stack|FunctionType|ResultType'); }
        if (!Array.isArray(stack[0]) || !Array.isArray(stack[1])) {
            throw new TypeError(
                'Argument mismatch: the signature is checkStack(Array<Instruction>, Stack|FunctionType) | '+
                'checkStack(Array<Instruction>, ResultType, ResultType)'
            );
        }
        let wrong!: [ boolean, number, number ];
        if (stack.some((s, x) => (s as Types.ResultType).some((v, i) => (wrong = [ !!x, v, i ], !Types.validValue(v))))) {
            throw new TypeError(
                'Invalid ValueType in ' + (wrong[0] ? 'Results' : 'Parameters') +
                ': 0x' + Number(wrong[1]).toString(16) + ' (index: ' + wrong[2] + ')'
            );
        }
        let result = this.resolveStack(instructions, stack[0], true);
        let expected = stack[1];
        return result && result.length == expected.length &&
                result.every((v, i) => v === expected[i]) || false;
    }
}

export abstract class ControlInstruction<O extends OpCodes=OpCodes> extends Instruction<O> { }

export class UnreachableInstruction extends ControlInstruction<OpCodes.unreachable> {
    private constructor() { super(OpCodes.unreachable); }
    public static readonly instance = new UnreachableInstruction();
}
UnreachableInstruction.registerInstruction(OpCodes.unreachable);

export class NopInstruction extends ControlInstruction<OpCodes.nop> {
    private constructor() { super(OpCodes.nop); }
    public static readonly instance = new NopInstruction();
}
NopInstruction.registerInstruction(OpCodes.nop);

export const EmptyBlock = 0x40;
export type BlockType = null | Types.ValueType | Types.FunctionType;
export type BlockInstructionCodes = OpCodes.block | OpCodes.loop | OpCodes.if;
export abstract class AbstractBlockInstruction<O extends BlockInstructionCodes=BlockInstructionCodes> extends ControlInstruction<O> {
    public Type: BlockType;
    public readonly Block!: Instruction[];

    protected constructor(code: O, block?: BlockType, instructions: Instruction[]=[]) {
        super(code);
        this.Type = block || null;
        protect(this, 'Block', instructions.slice(), true);
    }

    public getDefinedTypes(): Types.FunctionType[] {
        let result = this.Block
                        .filter(i => i instanceof AbstractBlockInstruction)
                        .map(b => (b as AbstractBlockInstruction).getDefinedTypes())
                        .reduce((a, v) => (a.push(...v), a), []);
        if (this.Type instanceof Types.FunctionType) { result.unshift(this.Type); }
        return result;
    }
    public getDefinedGlobals(): Sections.GlobalVariable[] {
        let r = this.Block
                    .filter(i => i instanceof GlobalVariableInstruction)
                    .map(g => (g as GlobalVariableInstruction).Variable);
        r.push(
            ...this.Block
                    .filter(i => i instanceof AbstractBlockInstruction)
                    .map(i => (i as AbstractBlockInstruction).getDefinedGlobals())
                    .reduce((a, v) => (a.push(...v), a), [])
        );
        return r;
    }

    public getLabel(relative: AbstractBranchInstruction, pass?: boolean) {
        let children: AbstractBlockInstruction<BlockInstructionCodes>[] = [];
        if (this.Block.find(i => (i instanceof AbstractBlockInstruction && children.push(i), i === relative))) {
            return 0;
        }
        let l: number = -1;
        if (children.find(c => (l = c.getLabel(relative, true), l != -1))) { return l + 1; }
        if (!pass) { throw new Error('Branch Instruction is not part of this Block Instruction'); }
        return -1;
    }

    protected encodeOpen(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        if (!this.Type) { encoder.uint8(EmptyBlock); }
        else if (this.Type instanceof Types.FunctionType) {
            let index = context.module.TypeSection.indexOf(this.Type);
            if (index < 0) { throw new Error('Invalid Block Type type reference'); }
            encoder.int32(index);
        }
        else { encoder.uint8(this.Type); }
    }
    protected encodeBlock(encoder: IEncoder, context: ExpressionContext): void {
        encoder.array(this.Block, context);
    }
    protected encodeClose(encoder: IEncoder, _: ExpressionContext): void {
        encoder.uint8(OpCodes.end);
    }

    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        context.blocks.unshift(this);
        this.encodeOpen(encoder, context);
        this.encodeBlock(encoder, context);
        this.encodeClose(encoder, context);
        if (context.blocks.shift() !== this) { throw new Error('Unexpected block on the context stack'); }
    }

    protected decodeType(decoder: IDecoder, context: ExpressionContext): BlockType {
        let header = decoder.peek(), block;
        if (header === EmptyBlock) { block = null; decoder.uint8(); }
        else if (header in Types.Type) { block = header; decoder.uint8(); }
        else {
            let index = decoder.int32();
            if (!context.module.TypeSection.Types[index]) {
                throw new Error('Invalid Block Type type reference');
            }
            block = context.module.TypeSection.Types[index]!;
        }
        return block;
    }
    protected decodeBlock(decoder: IDecoder, context: ExpressionContext): Instruction[] {
        let instructions = [];
        let c = decoder.peek();
        while (c != OpCodes.end && c != OpCodes.else) {
            instructions.push(decoder.decode(Instruction, context));
            c = decoder.peek();
        }
        return instructions;
    }
    public decode(decoder: IDecoder, context: ExpressionContext): void {
        context.blocks.unshift(this);
        let type = this.decodeType(decoder, context);
        let block = this.decodeBlock(decoder, context);
        decoder.uint8();
        if (context.blocks.shift() !== this) { throw new Error('Unexpected block on the context stack'); }
        this.Type = type;
        this.Block.length = 0;
        this.Block.push(...block);
    }

    public static override decode<O extends BlockInstructionCodes>(
        this: Ctor<AbstractBlockInstruction<O>>,
        decoder: IDecoder,
        context: ExpressionContext
    ): AbstractBlockInstruction<O> {
        let block = new this();
        block.decode(decoder, context);
        return block;
    }
    public static readonly EmptyBlock = EmptyBlock;
}

export class BlockInstruction extends AbstractBlockInstruction<OpCodes.block> {
    public constructor(block?: BlockType, instructions: Instruction[]=[]) { super(OpCodes.block, block, instructions); }
}
BlockInstruction.registerInstruction(OpCodes.block);
export class LoopInstruction extends AbstractBlockInstruction<OpCodes.loop> {
    public constructor(block?: BlockType, instructions: Instruction[]=[]) { super(OpCodes.loop, block, instructions); }
}
LoopInstruction.registerInstruction(OpCodes.loop);
export class IfThenElseInstruction extends AbstractBlockInstruction<OpCodes.if> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [] ]; }
    public readonly Else!: Instruction[];
    public get Then(): Instruction[] { return this.Block; }
    public constructor(thenType?: BlockType, then: Instruction[] = [], elseBlock: Instruction[]=[]) {
        super(OpCodes.if, thenType, then);
        protect(this, 'Else', elseBlock.slice(), true);
    }

    public override getDefinedTypes(): Types.FunctionType[] {
        let result = []
        result.push(
            ...this.Block
            .filter(i => i instanceof AbstractBlockInstruction)
            .map(b => (b as AbstractBlockInstruction).getDefinedTypes())
            .reduce((a, v) => (a.push(...v), a), []),
            ...this.Else
            .filter(i => i instanceof AbstractBlockInstruction)
            .map(b => (b as AbstractBlockInstruction).getDefinedTypes())
            .reduce((a, v) => (a.push(...v), a), [])
        );
        if (this.Type instanceof Types.FunctionType) { result.unshift(this.Type); }
        return result;
    }

    public override encodeBlock(encoder: IEncoder, context: ExpressionContext): void {
        super.encodeBlock(encoder, context)
        if (this.Else.length) { encoder.uint8(OpCodes.else).array(this.Else, context); }
    }

    public override decode(decoder: IDecoder, context: ExpressionContext): void {
        context.blocks.unshift(this);
        let type = this.decodeType(decoder, context);
        let block = this.decodeBlock(decoder, context);
        let elseBlock: Instruction[] = [];
        if (decoder.uint8() === OpCodes.else) {
            elseBlock = this.decodeBlock(decoder, context);
            decoder.uint8();
        }
        if (context.blocks.shift() !== this) { throw new Error('Unexpected block on the context stack'); }
        this.Type = type;
        this.Block.length = 0;
        this.Block.push(...block);
        this.Else.length = 0;
        this.Else.push(...elseBlock);
    }
}
IfThenElseInstruction.registerInstruction(OpCodes.if);

export type BranchInstructionCodes = OpCodes.br | OpCodes.br_if | OpCodes.br_table;
export abstract class AbstractBranchInstruction<O extends BranchInstructionCodes=BranchInstructionCodes> extends Instruction<O> {
    public Target: AbstractBlockInstruction;
    protected constructor(code: O, target: AbstractBlockInstruction) {
        super(code);
        this.Target = target;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let index = this.Target.getLabel(this);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(
        this: Ctor<AbstractBranchInstruction, [ AbstractBlockInstruction ]>,
        decoder: IDecoder,
        context: ExpressionContext
    ): AbstractBranchInstruction {
        super.decode(decoder, context);
        let label = decoder.uint32();
        if (!context.blocks[label]) { throw new Error('Encountered an invalid label'); }
        return new this(context.blocks[label]!);
    }
}

export class BranchInstruction extends AbstractBranchInstruction<OpCodes.br> {
    constructor(target: AbstractBlockInstruction) { super(OpCodes.br, target); }
}
BranchInstruction.registerInstruction(OpCodes.br);
export class BranchIfInstruction extends AbstractBranchInstruction<OpCodes.br_if> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [] ]; }
    constructor(target: AbstractBlockInstruction) { super(OpCodes.br_if, target); }
}
BranchIfInstruction.registerInstruction(OpCodes.br_if);
export class BranchTableInstruction extends AbstractBranchInstruction<OpCodes.br_table> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [] ]; }
    public readonly Targets!: AbstractBlockInstruction[];
    constructor(firstTarget: AbstractBlockInstruction, ...targets: AbstractBlockInstruction[]) {
        super(OpCodes.br_table, firstTarget);
        protect(this, 'Targets', targets.slice(), true);
    }
    public override encode(encoder: IEncoder, _?: ExpressionContext): void {
        let idxs = this.Targets.map(t => t.getLabel(this));
        let index = this.Target.getLabel(this);
        let targets = [ index, ...idxs ];
        encoder.uint8(this.Code)
            .vector(targets.slice(0, -1), 'uint32')
            .uint32(targets.slice(-1)[0]!);
    }
    public static override decode(decoder: IDecoder, context: ExpressionContext): BranchTableInstruction {
        let bti = AbstractBranchInstruction.decode.call(this, decoder, context) as BranchTableInstruction;
        let labels = decoder.vector('uint32')
        labels.push(decoder.uint32());
        if (labels.some(l => !context.blocks[l])) { throw new Error('Branch Table Instruction invalid target label'); }
        bti.Targets.length = 0;
        bti.Targets.push(...labels.map(l => context.blocks[l]!));
        return bti;
    }
}
BranchTableInstruction.registerInstruction(OpCodes.br_table);

export class ReturnInstruction extends ControlInstruction<OpCodes.return> {
    public override get stack(): StackEdit { return [ [ null ], [ { ref: 0 } ] ]; }
    private constructor() { super(OpCodes.return); }
    public static readonly instance = new ReturnInstruction();
}
ReturnInstruction.registerInstruction(OpCodes.return);

export type CallInstructionCodes = OpCodes.call | OpCodes.call_indirect;
export abstract class AbstractCallInstruction<O extends CallInstructionCodes=CallInstructionCodes> extends ControlInstruction<O> { }

export class CallInstruction extends AbstractCallInstruction<OpCodes.call> {
    public override get stack(): StackEdit { return [ this.Function.Parameters.slice(), this.Function.Results.slice() ]; }
    public Function: Types.FunctionType;
    public constructor(fn: Types.FunctionType) {
        super(OpCodes.call);
        this.Function = fn;
    }
    public getFunctionIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.TypeSection.indexOf(this.Function);
        if(!pass && index < 0) { throw new Error('Call Instruction invalid function reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let index = this.getFunctionIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(decoder: IDecoder, context: ExpressionContext): CallInstruction {
        let index = decoder.uint32();
        if (!context.module.FunctionSection.Functions[index]) { throw new Error('Call Instruction invalid function reference'); }
        return new CallInstruction(context.module.FunctionSection.Functions[index]!);
    }
}
CallInstruction.registerInstruction(OpCodes.call);

export class CallIndirectInstruction extends AbstractCallInstruction<OpCodes.call_indirect> {
    public override get stack(): StackEdit {
        return [
            this.Type.Parameters.slice().concat([ Types.Type.i32 ]),
            this.Type.Results.slice()
        ];
    }
    public Type: Types.FunctionType;
    public Table: Types.TableType;
    public constructor(fn: Types.FunctionType, table: Types.TableType) {
        super(OpCodes.call_indirect);
        this.Type = fn;
        this.Table = table;
    }
    public getTypeIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.TypeSection.indexOf(this.Type);
        if(!pass && index < 0) { throw new Error('Call Indirect Instruction invalid type reference'); }
        return index;
    }
    public getTableIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.TableSection.Tables.indexOf(this.Table);
        if(!pass && index < 0) { throw new Error('Call Indirect Instruction invalid table reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let tid = this.getTypeIndex(context),
            xid = this.getTableIndex(context);
        super.encode(encoder, context);
        encoder.uint32(tid).uint32(xid);
    }
    public static override decode(decoder: IDecoder, context: ExpressionContext): CallIndirectInstruction {
        let type = decoder.uint32();
        if (!context.module.TypeSection.Types[type]) { throw new Error('Call Indirect Instruction invalid type reference'); }
        let table = decoder.uint32();
        if (!context.module.TableSection.Tables[table]) { throw new Error('Call Indirect Instruction invalid table reference'); }
        return new CallIndirectInstruction(
            context.module.TypeSection.Types[type]!,
            context.module.TableSection.Tables[table]!
        );
    }
}
CallIndirectInstruction.registerInstruction(OpCodes.call_indirect);

export type ReferenceInstructionCodes = OpCodes.ref_null | OpCodes.ref_func | OpCodes.ref_is_null;
export abstract class ReferenceInstruction<O extends ReferenceInstructionCodes=ReferenceInstructionCodes> extends Instruction<O> { }

export class ReferenceNullInstruction extends ReferenceInstruction<OpCodes.ref_null> {
    public Type: Types.ReferenceType;
    public constructor(type: Types.ReferenceType) { super(OpCodes.ref_null); this.Type = type; }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.uint8(this.Type);
    }
    public static override decode(decoder: IDecoder, _?: ExpressionContext): ReferenceNullInstruction {
        return new ReferenceNullInstruction(decoder.uint8());
    }
    public static readonly FunctionRef = new ReferenceNullInstruction(Types.Type.funcref); 
    public static readonly ExternalRef = new ReferenceNullInstruction(Types.Type.externref); 
}
ReferenceNullInstruction.registerInstruction(OpCodes.ref_null);
export class ReferenceIsNullInstruction extends ReferenceInstruction<OpCodes.ref_is_null> {
    public override get stack(): StackEdit { return [ [], [ Types.Type.i32 ] ]; }
    private constructor() { super(OpCodes.ref_is_null); }
    public static readonly instance = new ReferenceIsNullInstruction();
}
ReferenceIsNullInstruction.registerInstruction(OpCodes.ref_is_null);

export class ReferenceFunctionInstruction extends ReferenceInstruction<OpCodes.ref_func> {
    public Function: Types.FunctionType;
    public constructor(fn: Types.FunctionType) { super(OpCodes.ref_func); this.Function = fn; }
    public getFunctionIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.FunctionSection.indexOf(this.Function);
        if(!pass && index < 0) { throw new Error('Reference Instruction invalid function reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let index = this.getFunctionIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(decoder: IDecoder, context: ExpressionContext): ReferenceFunctionInstruction {
        let index = decoder.uint32();
        if (!context.module.FunctionSection.Functions[index]) { throw new Error('Reference Instruction invalid function reference'); }
        return new ReferenceFunctionInstruction(context.module.FunctionSection.Functions[index]!);
    }
}
ReferenceFunctionInstruction.registerInstruction(OpCodes.ref_func);

export type ParametricInstructionCodes = OpCodes.drop | OpCodes.select | OpCodes.select_t;
export abstract class ParametricInstruction<O extends ParametricInstructionCodes=ParametricInstructionCodes> extends Instruction<O> { }

export class DropInstruction extends ParametricInstruction<OpCodes.drop> {
    private constructor() { super(OpCodes.drop); }
    public static readonly instance = new DropInstruction();
}
DropInstruction.registerInstruction(OpCodes.drop);
export class SelectInstruction extends ParametricInstruction<OpCodes.select> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [] ]; }
    private constructor() { super(OpCodes.select); }
    public static readonly instance = new SelectInstruction();
}
SelectInstruction.registerInstruction(OpCodes.select);

export class SelectAllInstruction extends ParametricInstruction<OpCodes.select_t> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [] ]; }
    public readonly Values!: Types.ValueType[];
    public constructor(values: Types.ValueType[]) { super(OpCodes.select_t); protect(this, 'Values', values.slice(), true); }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.vector(this.Values, 'uint32');
    }
    public static override decode(decoder: IDecoder, _?: ExpressionContext): SelectAllInstruction {
        return new SelectAllInstruction(decoder.vector('uint8'));
    }
}
SelectAllInstruction.registerInstruction(OpCodes.select_t);

export type VariableInstructionCodes = OpCodes.local_get | OpCodes.local_set | OpCodes.local_tee | OpCodes.global_get | OpCodes.global_set;
export abstract class AbstractVariableInstruction<O extends VariableInstructionCodes> extends Instruction<O> { }
export type LocalVariableInstructionCodes = OpCodes.local_get | OpCodes.local_set | OpCodes.local_tee;
export abstract class LocalVariableInstruction<O extends LocalVariableInstructionCodes=LocalVariableInstructionCodes>
    extends AbstractVariableInstruction<O> {
    public Variable: number;
    protected constructor(code: O, index: number) { super(code); this.Variable = index; }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.uint32(this.Variable);
    }
    public static override decode(
        this: Ctor<LocalVariableInstruction, [ number ]>,
        decoder: IDecoder,
        _?: ExpressionContext
    ): LocalVariableInstruction { return new this(decoder.uint32()); }
}
export class LocalGetInstruction extends LocalVariableInstruction<OpCodes.local_get> {
    public constructor(index: number) { super(OpCodes.local_get, index); }
}
LocalGetInstruction.registerInstruction(OpCodes.local_get);
export class LocalSetInstruction extends LocalVariableInstruction<OpCodes.local_set> {
    public constructor(index: number) { super(OpCodes.local_set, index); }
}
LocalSetInstruction.registerInstruction(OpCodes.local_set);
export class LocalTeeInstruction extends LocalVariableInstruction<OpCodes.local_tee> {
    public constructor(index: number) { super(OpCodes.local_tee, index); }
}
LocalTeeInstruction.registerInstruction(OpCodes.local_tee);
export type GlobalVariableInstructionCodes = OpCodes.global_get | OpCodes.global_set;
export abstract class GlobalVariableInstruction<O extends GlobalVariableInstructionCodes=GlobalVariableInstructionCodes>
    extends AbstractVariableInstruction<O> {
    public Variable: Sections.GlobalVariable;
    protected constructor(code: O, variable: Sections.GlobalVariable) { super(code); this.Variable = variable; }
    public getVariableIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.GlobalSection.Globals.indexOf(this.Variable);
        if (!pass && index < 0) { throw new Error('Global Variable Instruction invalid variable reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let index = this.getVariableIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }

    public static override decode(
        this: Ctor<GlobalVariableInstruction, [ Sections.GlobalVariable ]>,
        decoder: IDecoder,
        context: ExpressionContext
    ): GlobalVariableInstruction {
        return new this(decoder.decode(Sections.GlobalVariable, context.module));
    }
}
export class GlobalGetInstruction extends GlobalVariableInstruction<OpCodes.global_get> {
    public constructor(variable: Sections.GlobalVariable) { super(OpCodes.global_get, variable); }
}
GlobalGetInstruction.registerInstruction(OpCodes.global_get);
export class GlobalSetInstruction extends GlobalVariableInstruction<OpCodes.global_set> {
    public constructor(variable: Sections.GlobalVariable) { super(OpCodes.global_set, variable); }
}
GlobalSetInstruction.registerInstruction(OpCodes.global_set);

export type TableInstructionCodes = OpCodes.table_get | OpCodes.table_set | OpCodes.op_extension_1;
export abstract class AbstractTableInstruction<O extends TableInstructionCodes> extends Instruction<O> { }

export class TableGetInstruction extends AbstractTableInstruction<OpCodes.table_get> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [] ]; }
    private constructor() { super(OpCodes.table_get); }
    public static readonly instance = new TableGetInstruction();
}
TableGetInstruction.registerInstruction(OpCodes.table_get);
export class TableSetInstruction extends AbstractTableInstruction<OpCodes.table_set> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [] ]; }
    private constructor() { super(OpCodes.table_set); }
    public static readonly instance = new TableSetInstruction();
}
TableSetInstruction.registerInstruction(OpCodes.table_set);

export type TableInstructionForwardCodes = OpCodesExt1.table_copy | OpCodesExt1.table_fill | OpCodesExt1.table_grow |
                                            OpCodesExt1.table_init | OpCodesExt1.table_size | OpCodesExt1.elem_drop;
export abstract class TableInstruction<O extends TableInstructionForwardCodes=TableInstructionForwardCodes> extends AbstractTableInstruction<OpCodes.op_extension_1> {
    public readonly OperationCode!: O;
    public Table: Types.TableType;
    protected constructor(code: O, table: Types.TableType) {
        super(OpCodes.op_extension_1);
        protect(this, 'OperationCode', code, true);
        this.Table = table;
    }
    public getTableIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.TableSection.Tables.indexOf(this.Table);
        if(!pass && index < 0) { throw new Error('Table Instruction invalid table reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode);
    }
}
export class TableInitInstruction extends TableInstruction<OpCodesExt1.table_init> {
    public Element: Sections.ElementSegment;
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32, Types.Type.i32 ], [] ]; }
    public constructor(table: Types.TableType, element: Sections.ElementSegment) { super(OpCodesExt1.table_init, table); this.Element = element; }
    public getElementIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.ElementSection.Elements.indexOf(this.Element);
        if(!pass && index < 0) { throw new Error('Table Init Instruction invalid element reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let elem = this.getElementIndex(context),
            table = this.getTableIndex(context);
        super.encode(encoder, context);
        encoder.uint32(elem).uint32(table);
    }
    public static override decode(decoder: IDecoder, context: ExpressionContext): TableInitInstruction {
        let elem = decoder.uint32();
        if (!context.module.ElementSection.Elements[elem]) { throw new Error('Table Init Instruction invalid element reference'); }
        let table = decoder.uint32();
        if (!context.module.TableSection.Tables[table]) { throw new Error('Table Init Instruction invalid table reference'); }
        return new TableInitInstruction(
            context.module.TableSection.Tables[table]!,
            context.module.ElementSection.Elements[elem]!
        );
    }
}
TableInitInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.table_init);
export class ElementDropInstruction extends TableInstruction<OpCodesExt1.elem_drop> {
    public Element: Sections.ElementSegment;
    public constructor(element: Sections.ElementSegment) {
        super(OpCodesExt1.elem_drop, null as any);
        this.Element = element;
    }
    public getElementIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.ElementSection.Elements.indexOf(this.Element);
        if(!pass && index < 0) { throw new Error('Table Init Instruction invalid element reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let elem = this.getElementIndex(context);
        super.encode(encoder, context);
        encoder.uint32(elem);
    }
    public static override decode(decoder: IDecoder, context: ExpressionContext): ElementDropInstruction {
        let elem = decoder.uint32();
        if (!context.module.ElementSection.Elements[elem]) { throw new Error('Element Drop Instruction invalid element reference'); }
        return new ElementDropInstruction(context.module.ElementSection.Elements[elem]!);
    }
}
ElementDropInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.elem_drop);
export class TableCopyInstruction extends TableInstruction<OpCodesExt1.table_copy> {
    public Destination: Types.TableType;
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32, Types.Type.i32 ], [] ]; }
    public get Source(): Types.TableType { return this.Table; }
    public set Source(value: Types.TableType) { this.Table = value; }
    public constructor(table: Types.TableType, destination: Types.TableType) {
        super(OpCodesExt1.table_copy, table);
        this.Destination = destination;
    }
    public getDestinationIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.TableSection.Tables.indexOf(this.Destination);
        if(!pass && index < 0) { throw new Error('Table Instruction invalid destination table reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let dst = this.getDestinationIndex(context),
            src = this.getTableIndex(context);
        super.encode(encoder, context);
        encoder.uint32(src).uint32(dst);
    }
    public static override decode(decoder: IDecoder, context: ExpressionContext): TableCopyInstruction {
        let src = decoder.uint32();
        if (!context.module.TableSection.Tables[src]) { throw new Error('Table Copy Instruction invalid source table reference'); }
        let dest = decoder.uint32();
        if (!context.module.TableSection.Tables[dest]) { throw new Error('Table Copy Instruction invalid destination table reference'); }
        return new TableCopyInstruction(
            context.module.TableSection.Tables[src]!,
            context.module.TableSection.Tables[dest]!
        );
    }
}
TableCopyInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.table_copy);
export type TableOpInstructionCodes = OpCodesExt1.table_grow | OpCodesExt1.table_size | OpCodesExt1.table_fill;
export abstract class TableOpInstruction<O extends TableOpInstructionCodes=TableOpInstructionCodes> extends TableInstruction<O> {
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let index = this.getTableIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(
        this: Ctor<TableOpInstruction, [ Types.TableType ]>,
        decoder: IDecoder,
        context: ExpressionContext
    ): TableOpInstruction {
        let index = decoder.uint32();
        if (!context.module.TableSection.Tables[index]) { throw new Error('Table Operation Instruction invalid table reference'); }
        return new this(context.module.TableSection.Tables[index]!);
    }
}
export class TableGrowInstruction extends TableOpInstruction<OpCodesExt1.table_grow> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i32 ] ]; }
    public constructor(table: Types.TableType) { super(OpCodesExt1.table_grow, table); }
}
TableGrowInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.table_grow);
export class TableSizeInstruction extends TableOpInstruction<OpCodesExt1.table_size> {
    public override get stack(): StackEdit { return [ [], [ Types.Type.i32 ] ]; }
    public constructor(table: Types.TableType) { super(OpCodesExt1.table_size, table); }
}
TableSizeInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.table_size);

export class TableFillInstruction extends TableOpInstruction<OpCodesExt1.table_fill> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ]; }
    public constructor(table: Types.TableType) { super(OpCodesExt1.table_fill, table); }
}
TableFillInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.table_fill);


export type MemoryInstructionCodes =
                OpCodes.i32_load | OpCodes.i64_load | OpCodes.f32_load | OpCodes.f64_load |
                OpCodes.i32_load8_s | OpCodes.i32_load8_u | OpCodes.i32_load16_s |
                OpCodes.i32_load16_u | OpCodes.i64_load8_s | OpCodes.i64_load8_u |
                OpCodes.i64_load16_s | OpCodes.i64_load16_u | OpCodes.i64_load32_s |
                OpCodes.i64_load32_u | OpCodes.i32_store | OpCodes.i64_store |
                OpCodes.f32_store | OpCodes.f64_store | OpCodes.i32_store8 |
                OpCodes.i32_store16 | OpCodes.i64_store8 | OpCodes.i64_store16 |
                OpCodes.i64_store32 | OpCodes.memory_size | OpCodes.memory_grow |
                OpCodes.op_extension_1;

export abstract class AbstractMemoryInstruction<O extends MemoryInstructionCodes> extends Instruction<O> { }

export type MemoryLoadInstructionCodes =
                OpCodes.i32_load | OpCodes.i64_load | OpCodes.f32_load | OpCodes.f64_load |
                OpCodes.i32_load8_s | OpCodes.i32_load8_u | OpCodes.i32_load16_s |
                OpCodes.i32_load16_u | OpCodes.i64_load8_s | OpCodes.i64_load8_u |
                OpCodes.i64_load16_s | OpCodes.i64_load16_u | OpCodes.i64_load32_s | OpCodes.i64_load32_u;
export type MemoryStoreInstructionCodes =
                OpCodes.i32_store | OpCodes.i64_store | OpCodes.f32_store | OpCodes.f64_store |
                OpCodes.i32_store8 | OpCodes.i32_store16 | OpCodes.i64_store8 | OpCodes.i64_store16 |
                OpCodes.i64_store32;

export abstract class MemoryManagementInstruction<O extends MemoryLoadInstructionCodes | MemoryStoreInstructionCodes>
    extends AbstractMemoryInstruction<O> {
    public Align: number;
    public Offset: number;
    protected constructor(code: O) { super(code); this.Align = 0; this.Offset = 0; }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.uint32(this.Align).uint32(this.Offset);
    }
}
export abstract class MemoryLoadInstruction<O extends MemoryLoadInstructionCodes> extends MemoryManagementInstruction<O> {}
export abstract class MemoryStoreInstruction<O extends MemoryStoreInstructionCodes> extends MemoryManagementInstruction<O> {}
export class I32LoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i32 ] ]; }
    private constructor() { super(OpCodes.i32_load); }
    public static readonly instance = new I32LoadInstruction();
}
I32LoadInstruction.registerInstruction(OpCodes.i32_load);
export class I64LoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i64 ] ]; }
    private constructor() { super(OpCodes.i64_load); }
    public static readonly instance = new I64LoadInstruction();
}
I64LoadInstruction.registerInstruction(OpCodes.i64_load);
export class F32LoadInstruction extends MemoryLoadInstruction<OpCodes.f32_load> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.f32 ] ]; }
    private constructor() { super(OpCodes.f32_load); }
    public static readonly instance = new F32LoadInstruction();
}
F32LoadInstruction.registerInstruction(OpCodes.f32_load);
export class F64LoadInstruction extends MemoryLoadInstruction<OpCodes.f64_load> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.f64 ] ]; }
    private constructor() { super(OpCodes.f64_load); }
    public static readonly instance = new F64LoadInstruction();
}
F64LoadInstruction.registerInstruction(OpCodes.f64_load);
export class I32Load8SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load8_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i32 ] ]; }
    private constructor() { super(OpCodes.i32_load8_s); }
    public static readonly instance = new I32Load8SignedLoadInstruction();
}
I32Load8SignedLoadInstruction.registerInstruction(OpCodes.i32_load8_s);
export class I32Load16SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load16_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i32 ] ]; }
    private constructor() { super(OpCodes.i32_load16_s); }
    public static readonly instance = new I32Load16SignedLoadInstruction();
}
I32Load16SignedLoadInstruction.registerInstruction(OpCodes.i32_load16_s);
export class I64Load8SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load8_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i64 ] ]; }
    private constructor() { super(OpCodes.i64_load8_s); }
    public static readonly instance = new I64Load8SignedLoadInstruction();
}
I64Load8SignedLoadInstruction.registerInstruction(OpCodes.i64_load8_s);
export class I64Load16SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load16_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i64 ] ]; }
    private constructor() { super(OpCodes.i64_load16_s); }
    public static readonly instance = new I64Load16SignedLoadInstruction();
}
I64Load16SignedLoadInstruction.registerInstruction(OpCodes.i64_load16_s);
export class I64Load32SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load32_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i64 ] ]; }
    private constructor() { super(OpCodes.i64_load32_s); }
    public static readonly instance = new I64Load32SignedLoadInstruction();
}
I64Load32SignedLoadInstruction.registerInstruction(OpCodes.i64_load32_s);
export class I32Load8UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load8_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i32 ] ]; }
    private constructor() { super(OpCodes.i32_load8_u); }
    public static readonly instance = new I32Load8UnsignedLoadInstruction();
}
I32Load8UnsignedLoadInstruction.registerInstruction(OpCodes.i32_load8_u);
export class I32Load16UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load16_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i32 ] ]; }
    private constructor() { super(OpCodes.i32_load16_u); }
    public static readonly instance = new I32Load16UnsignedLoadInstruction();
}
I32Load16UnsignedLoadInstruction.registerInstruction(OpCodes.i32_load16_u);
export class I64Load8UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load8_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i64 ] ]; }
    private constructor() { super(OpCodes.i64_load8_u); }
    public static readonly instance = new I64Load8UnsignedLoadInstruction();
}
I64Load8UnsignedLoadInstruction.registerInstruction(OpCodes.i64_load8_u);
export class I64Load16UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load16_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i64 ] ]; }
    private constructor() { super(OpCodes.i64_load16_u); }
    public static readonly instance = new I64Load16UnsignedLoadInstruction();
}
I64Load16UnsignedLoadInstruction.registerInstruction(OpCodes.i64_load16_u);
export class I64Load32UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load32_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i64 ] ]; }
    private constructor() { super(OpCodes.i64_load32_u); }
    public static readonly instance = new I64Load32UnsignedLoadInstruction();
}
I64Load32UnsignedLoadInstruction.registerInstruction(OpCodes.i64_load32_u);

export class I32StoreInstruction extends MemoryStoreInstruction<OpCodes.i32_store> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [] ]; }
    private constructor() { super(OpCodes.i32_store); }
    public static readonly instance = new I32StoreInstruction();
}
I32StoreInstruction.registerInstruction(OpCodes.i32_store);
export class I64StoreInstruction extends MemoryStoreInstruction<OpCodes.i64_store> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i64 ], [] ]; }
    private constructor() { super(OpCodes.i64_store); }
    public static readonly instance = new I64StoreInstruction();
}
I64StoreInstruction.registerInstruction(OpCodes.i64_store);
export class F32StoreInstruction extends MemoryStoreInstruction<OpCodes.f32_store> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.f32 ], [] ]; }
    private constructor() { super(OpCodes.f32_store); }
    public static readonly instance = new F32StoreInstruction();
}
F32StoreInstruction.registerInstruction(OpCodes.f32_store);
export class F64StoreInstruction extends MemoryStoreInstruction<OpCodes.f64_store> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.f64 ], [] ]; }
    private constructor() { super(OpCodes.f64_store); }
    public static readonly instance = new F64StoreInstruction();
}
F64StoreInstruction.registerInstruction(OpCodes.f64_store);
export class I32Store8Instruction extends MemoryStoreInstruction<OpCodes.i32_store8> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [] ]; }
    private constructor() { super(OpCodes.i32_store8); }
    public static readonly instance = new I32Store8Instruction();
}
I32Store8Instruction.registerInstruction(OpCodes.i32_store8);
export class I32Store16Instruction extends MemoryStoreInstruction<OpCodes.i32_store16> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [] ]; }
    private constructor() { super(OpCodes.i32_store16); }
    public static readonly instance = new I32Store16Instruction();
}
I32Store16Instruction.registerInstruction(OpCodes.i32_store16);
export class I64Store8Instruction extends MemoryStoreInstruction<OpCodes.i64_store8> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i64 ], [] ]; }
    private constructor() { super(OpCodes.i64_store8); }
    public static readonly instance = new I64Store8Instruction();
}
I64Store8Instruction.registerInstruction(OpCodes.i64_store8);
export class I64Store16Instruction extends MemoryStoreInstruction<OpCodes.i64_store16> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i64 ], [] ]; }
    private constructor() { super(OpCodes.i64_store16); }
    public static readonly instance = new I64Store16Instruction();
}
I64Store16Instruction.registerInstruction(OpCodes.i64_store16);
export class I64Store32Instruction extends MemoryStoreInstruction<OpCodes.i64_store32> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i64 ], [] ]; }
    private constructor() { super(OpCodes.i64_store32); }
    public static readonly instance = new I64Store32Instruction();
}
I64Store32Instruction.registerInstruction(OpCodes.i64_store32);

export class MemorySizeInstruction extends AbstractMemoryInstruction<OpCodes.memory_size> {
    public override get stack(): StackEdit { return [ [], [ Types.Type.i32 ] ]; }
    private constructor() { super(OpCodes.memory_size); }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.uint8(0x00);
    }
    public static readonly instance = new MemorySizeInstruction();
}
MemorySizeInstruction.registerInstruction(OpCodes.memory_size);
export class MemoryGrowInstruction extends AbstractMemoryInstruction<OpCodes.memory_grow> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i32 ] ]; }
    private constructor() { super(OpCodes.memory_grow); }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.uint8(0x00);
    }
    public static readonly instance = new MemoryGrowInstruction();
}
MemoryGrowInstruction.registerInstruction(OpCodes.memory_grow);

export class MemoryInitInstruction extends AbstractMemoryInstruction<OpCodes.op_extension_1> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32, Types.Type.i32 ], [] ]; }
    public readonly OperationCode!: OpCodesExt1.memory_init;
    public Data: Sections.DataSegment;
    public constructor(data: Sections.DataSegment) {
        super(OpCodes.op_extension_1);
        protect(this, 'OperationCode', OpCodesExt1.memory_init, true);
        this.Data = data;
    }
    public getDataIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.DataSection.Datas.indexOf(this.Data);
        if (!pass && index < 0) { throw new Error('Memory Init Instruction invalid data reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let index = this.getDataIndex(context);
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode).uint32(index).uint8(0x00);
    }

    public static override decode(decoder: IDecoder, context: ExpressionContext): MemoryInitInstruction {
        let index = decoder.uint32();
        if (!context.module.DataSection.Datas[index]) { throw new Error('Memory Init Instruction invalid data reference'); }
        let b;
        if ((b = decoder.uint8()) !== 0x00) { throw new Error('Memory Init Instruction unexpected closing byte: 0x' + Number(b).toString(16)); }
        return new MemoryInitInstruction(context.module.DataSection.Datas[index]!)
    }
}
MemoryInitInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.memory_init);
export class DataDropInstruction extends AbstractMemoryInstruction<OpCodes.op_extension_1> {
    public readonly OperationCode!: OpCodesExt1.data_drop;
    public Data: Sections.DataSegment;
    public constructor(data: Sections.DataSegment) {
        super(OpCodes.op_extension_1);
        protect(this, 'OperationCode', OpCodesExt1.data_drop, true);
        this.Data = data;
    }
    public getDataIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.DataSection.Datas.indexOf(this.Data);
        if (!pass && index < 0) { throw new Error('Memory Init Instruction invalid data reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let index = this.getDataIndex(context);
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode).uint32(index);
    }
    public static override decode(decoder: IDecoder, context: ExpressionContext): DataDropInstruction {
        let index = decoder.uint32();
        if (!context.module.DataSection.Datas[index]) { throw new Error('Memory Init Instruction invalid data reference'); }
        return new DataDropInstruction(context.module.DataSection.Datas[index]!)
    }
}
DataDropInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.data_drop);
export class MemoryCopyInstruction extends AbstractMemoryInstruction<OpCodes.op_extension_1> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32, Types.Type.i32 ], [] ]; }
    public readonly OperationCode!: OpCodesExt1.memory_copy;
    public constructor() {
        super(OpCodes.op_extension_1);
        protect(this, 'OperationCode', OpCodesExt1.memory_copy, true);
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode).uint8(0x00).uint8(0x00);
    }
    public static readonly instance = new MemoryCopyInstruction();
}
MemoryCopyInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.memory_copy);
export class MemoryFillInstruction extends AbstractMemoryInstruction<OpCodes.op_extension_1> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32, Types.Type.i32 ], [] ]; }
    public readonly OperationCode!: OpCodesExt1.memory_fill;
    public constructor() {
        super(OpCodes.op_extension_1);
        protect(this, 'OperationCode', OpCodesExt1.memory_fill, true);
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode).uint8(0x00);
    }
    public static readonly instance = new MemoryFillInstruction();
}
MemoryFillInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.memory_fill);

export abstract class AbstractNumericInstruction<O extends OpCodes> extends Instruction<O> { }

export type NumericConstInstructionCodes = OpCodes.i32_const | OpCodes.i64_const | OpCodes.f32_const | OpCodes.f64_const;
export abstract class NumericConstInstruction<O extends NumericConstInstructionCodes=NumericConstInstructionCodes> extends AbstractNumericInstruction<O> {
    public Value: number;
    protected constructor(code: O, value: number) { super(code); this.Value = value; }
}
export class I32ConstInstruction extends NumericConstInstruction<OpCodes.i32_const> {
    public override get stack(): StackEdit { return [ [], [ Types.Type.i32 ] ] }
    public constructor(value: number = 0) {super(OpCodes.i32_const, value); }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.int32(this.Value | 0)
    }
    public static override decode(decoder: IDecoder): I32ConstInstruction {
        return new I32ConstInstruction(decoder.uint32());
    }
}
I32ConstInstruction.registerInstruction(OpCodes.i32_const);
export class I64ConstInstruction extends NumericConstInstruction<OpCodes.i64_const> {
    public override get stack(): StackEdit { return [ [], [ Types.Type.i64 ] ] }
    public constructor(value: number | bigint = 0) {super(OpCodes.i64_const, value as number); }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.int64(this.Value)
    }
    public static override decode(decoder: IDecoder): I64ConstInstruction {
        return new I64ConstInstruction(decoder.uint64());
    }
}
I64ConstInstruction.registerInstruction(OpCodes.i64_const);
export class F32ConstInstruction extends NumericConstInstruction<OpCodes.f32_const> {
    public override get stack(): StackEdit { return [ [], [ Types.Type.f32 ] ] }
    public constructor(value: number = 0) {super(OpCodes.f32_const, value); }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.float32(this.Value)
    }
    public static override decode(decoder: IDecoder): F32ConstInstruction {
        return new F32ConstInstruction(decoder.float32());
    }
}
F32ConstInstruction.registerInstruction(OpCodes.f32_const)
export class F64ConstInstruction extends NumericConstInstruction<OpCodes.f64_const> {
    public override get stack(): StackEdit { return [ [], [ Types.Type.f64 ] ] }
    public constructor(value: number = 0) { super(OpCodes.f64_const, value); }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.float64(this.Value)
    }
    public static override decode(decoder: IDecoder): F64ConstInstruction {
        return new F64ConstInstruction(decoder.float64());
    }
}
F64ConstInstruction.registerInstruction(OpCodes.f64_const)

export class I32EqualZeroInstruction extends AbstractNumericInstruction<OpCodes.i32_eqz> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_eqz); }
    public static readonly instance = new I32EqualZeroInstruction();
}
I32EqualZeroInstruction.registerInstruction(OpCodes.i32_eqz);
export class I32EqualInstruction extends AbstractNumericInstruction<OpCodes.i32_eq> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_eq); }
    public static readonly instance = new I32EqualInstruction();
}
I32EqualInstruction.registerInstruction(OpCodes.i32_eq);
export class I32NotEqualInstruction extends AbstractNumericInstruction<OpCodes.i32_ne> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_ne); }
    public static readonly instance = new I32NotEqualInstruction();
}
I32NotEqualInstruction.registerInstruction(OpCodes.i32_ne);
export class I32LesserSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_lt_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_lt_s); }
    public static readonly instance = new I32LesserSignedInstruction();
}
I32LesserSignedInstruction.registerInstruction(OpCodes.i32_lt_s);
export class I32LesserUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_lt_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_lt_u); }
    public static readonly instance = new I32LesserUnsignedInstruction();
}
I32LesserUnsignedInstruction.registerInstruction(OpCodes.i32_lt_u);
export class I32GreaterSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_gt_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_gt_s); }
    public static readonly instance = new I32GreaterSignedInstruction();
}
I32GreaterSignedInstruction.registerInstruction(OpCodes.i32_gt_s);
export class I32GreaterUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_gt_u> {
    private constructor() { super(OpCodes.i32_gt_u); }
    public static readonly instance = new I32GreaterUnsignedInstruction();
}
I32GreaterUnsignedInstruction.registerInstruction(OpCodes.i32_gt_u);
export class I32LesserEqualSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_le_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_le_s); }
    public static readonly instance = new I32LesserEqualSignedInstruction();
}
I32LesserEqualSignedInstruction.registerInstruction(OpCodes.i32_le_s);
export class I32LesserEqualUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_le_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_le_u); }
    public static readonly instance = new I32LesserEqualUnsignedInstruction();
}
I32LesserEqualUnsignedInstruction.registerInstruction(OpCodes.i32_le_u);
export class I32GreaterEqualSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_ge_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_ge_s); }
    public static readonly instance = new I32GreaterEqualSignedInstruction();
}
I32GreaterEqualSignedInstruction.registerInstruction(OpCodes.i32_ge_s);
export class I32GreaterEqualUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_ge_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_ge_u); }
    public static readonly instance = new I32GreaterEqualUnsignedInstruction();
}
I32GreaterEqualUnsignedInstruction.registerInstruction(OpCodes.i32_ge_u);
export class I32LeadingBitsUnsigendInstruction extends AbstractNumericInstruction<OpCodes.i32_clz> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_clz); }
    public static readonly instance = new I32LeadingBitsUnsigendInstruction();
}
I32LeadingBitsUnsigendInstruction.registerInstruction(OpCodes.i32_clz);
export class I32TrailingBitsUnsigendInstruction extends AbstractNumericInstruction<OpCodes.i32_ctz> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_ctz); }
    public static readonly instance = new I32TrailingBitsUnsigendInstruction();
}
I32TrailingBitsUnsigendInstruction.registerInstruction(OpCodes.i32_ctz);
export class I32BitCountInstruction extends AbstractNumericInstruction<OpCodes.i32_popcnt> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_popcnt); }
    public static readonly instance = new I32BitCountInstruction();
}
I32BitCountInstruction.registerInstruction(OpCodes.i32_popcnt);
export class I32AddInstruction extends AbstractNumericInstruction<OpCodes.i32_add> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_add); }
    public static readonly instance = new I32AddInstruction();
}
I32AddInstruction.registerInstruction(OpCodes.i32_add);
export class I32SubtractInstruction extends AbstractNumericInstruction<OpCodes.i32_sub> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_sub); }
    public static readonly instance = new I32SubtractInstruction();
}
I32SubtractInstruction.registerInstruction(OpCodes.i32_sub);
export class I32MultiplyInstruction extends AbstractNumericInstruction<OpCodes.i32_mul> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_mul); }
    public static readonly instance = new I32MultiplyInstruction();
}
I32MultiplyInstruction.registerInstruction(OpCodes.i32_mul);
export class I32DivideSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_div_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_div_s); }
    public static readonly instance = new I32DivideSignedInstruction();
}
I32DivideSignedInstruction.registerInstruction(OpCodes.i32_div_s);
export class I32DivideUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_div_u> {
    private constructor() { super(OpCodes.i32_div_u); }
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    public static readonly instance = new I32DivideUnsignedInstruction();
}
I32DivideUnsignedInstruction.registerInstruction(OpCodes.i32_div_u);
export class I32RemainderSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_rem_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_rem_s); }
    public static readonly instance = new I32RemainderSignedInstruction();
}
I32RemainderSignedInstruction.registerInstruction(OpCodes.i32_rem_s);
export class I32RemainderUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_rem_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_rem_u); }
    public static readonly instance = new I32RemainderUnsignedInstruction();
}
I32RemainderUnsignedInstruction.registerInstruction(OpCodes.i32_rem_u);
export class I32AndInstruction extends AbstractNumericInstruction<OpCodes.i32_and> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_and); }
    public static readonly instance = new I32AndInstruction();
}
I32AndInstruction.registerInstruction(OpCodes.i32_and);
export class I32OrInstruction extends AbstractNumericInstruction<OpCodes.i32_or> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_or); }
    public static readonly instance = new I32OrInstruction();
}
I32OrInstruction.registerInstruction(OpCodes.i32_or);
export class I32XOrInstruction extends AbstractNumericInstruction<OpCodes.i32_xor> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_xor); }
    public static readonly instance = new I32XOrInstruction();
}
I32XOrInstruction.registerInstruction(OpCodes.i32_xor);
export class I32BitShifLeftInstruction extends AbstractNumericInstruction<OpCodes.i32_shl> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_shl); }
    public static readonly instance = new I32BitShifLeftInstruction();
}
I32BitShifLeftInstruction.registerInstruction(OpCodes.i32_shl);
export class I32BitShifRightSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_shr_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_shr_s); }
    public static readonly instance = new I32BitShifRightSignedInstruction();
}
I32BitShifRightSignedInstruction.registerInstruction(OpCodes.i32_shr_s);
export class I32BitShifRightUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_shr_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_shr_u); }
    public static readonly instance = new I32BitShifRightUnsignedInstruction();
}
I32BitShifRightUnsignedInstruction.registerInstruction(OpCodes.i32_shr_u);
export class I32BitRotationLeftInstruction extends AbstractNumericInstruction<OpCodes.i32_rotl> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_rotl); }
    public static readonly instance = new I32BitRotationLeftInstruction();
}
I32BitRotationLeftInstruction.registerInstruction(OpCodes.i32_rotl);
export class I32BitRotationRightInstruction extends AbstractNumericInstruction<OpCodes.i32_rotr> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32, Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_rotr); }
    public static readonly instance = new I32BitRotationRightInstruction();
}
I32BitRotationRightInstruction.registerInstruction(OpCodes.i32_rotr);
export class I32WrapI64Instruction extends AbstractNumericInstruction<OpCodes.i32_wrap_i64> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_wrap_i64); }
    public static readonly instance = new I32WrapI64Instruction();
}
I32WrapI64Instruction.registerInstruction(OpCodes.i32_wrap_i64);
export class I32TruncateF32SignedInstruction extends AbstractNumericInstruction<OpCodes.i32_trunc_f32_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_trunc_f32_s); }
    public static readonly instance = new I32TruncateF32SignedInstruction();
}
I32TruncateF32SignedInstruction.registerInstruction(OpCodes.i32_trunc_f32_s);
export class I32TruncateF32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_trunc_f32_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_trunc_f32_u); }
    public static readonly instance = new I32TruncateF32UnsignedInstruction();
}
I32TruncateF32UnsignedInstruction.registerInstruction(OpCodes.i32_trunc_f32_u);
export class I32TruncateF64SignedInstruction extends AbstractNumericInstruction<OpCodes.i32_trunc_f64_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_trunc_f64_s); }
    public static readonly instance = new I32TruncateF64SignedInstruction();
}
I32TruncateF64SignedInstruction.registerInstruction(OpCodes.i32_trunc_f64_s);
export class I32TruncateF64UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_trunc_f64_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_trunc_f64_u); }
    public static readonly instance = new I32TruncateF64UnsignedInstruction();
}
I32TruncateF64UnsignedInstruction.registerInstruction(OpCodes.i32_trunc_f64_u);
export class I32ReinterpretF32Instruction extends AbstractNumericInstruction<OpCodes.i32_reinterpret_f32> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_reinterpret_f32); }
    public static readonly instance = new I32ReinterpretF32Instruction();
}
I32ReinterpretF32Instruction.registerInstruction(OpCodes.i32_reinterpret_f32);
export class I32Extend8SignedInstruction extends AbstractNumericInstruction<OpCodes.i32_extend8_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_extend8_s); }
    public static readonly instance = new I32Extend8SignedInstruction();
}
I32Extend8SignedInstruction.registerInstruction(OpCodes.i32_extend8_s);
export class I32Extend16SignedInstruction extends AbstractNumericInstruction<OpCodes.i32_extend16_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_extend16_s); }
    public static readonly instance = new I32Extend16SignedInstruction();
}
I32Extend16SignedInstruction.registerInstruction(OpCodes.i32_extend16_s);

export class I64EqualZeroInstruction extends AbstractNumericInstruction<OpCodes.i64_eqz> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_eqz); }
    public static readonly instance = new I64EqualZeroInstruction();
}
I64EqualZeroInstruction.registerInstruction(OpCodes.i64_eqz);
export class I64EqualInstruction extends AbstractNumericInstruction<OpCodes.i64_eq> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_eq); }
    public static readonly instance = new I64EqualInstruction();
}
I64EqualInstruction.registerInstruction(OpCodes.i64_eq);
export class I64NotEqualInstruction extends AbstractNumericInstruction<OpCodes.i64_ne> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_ne); }
    public static readonly instance = new I64NotEqualInstruction();
}
I64NotEqualInstruction.registerInstruction(OpCodes.i64_ne);
export class I64LesserSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_lt_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_lt_s); }
    public static readonly instance = new I64LesserSignedInstruction();
}
I64LesserSignedInstruction.registerInstruction(OpCodes.i64_lt_s);
export class I64LesserUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_lt_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_lt_u); }
    public static readonly instance = new I64LesserUnsignedInstruction();
}
I64LesserUnsignedInstruction.registerInstruction(OpCodes.i64_lt_u);
export class I64GreaterSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_gt_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_gt_s); }
    public static readonly instance = new I64GreaterSignedInstruction();
}
I64GreaterSignedInstruction.registerInstruction(OpCodes.i64_gt_s);
export class I64GreaterUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_gt_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_gt_u); }
    public static readonly instance = new I64GreaterUnsignedInstruction();
}
I64GreaterUnsignedInstruction.registerInstruction(OpCodes.i64_gt_u);
export class I64LesserEqualSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_le_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_le_s); }
    public static readonly instance = new I64LesserEqualSignedInstruction();
}
I64LesserEqualSignedInstruction.registerInstruction(OpCodes.i64_le_s);
export class I64LesserEqualUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_le_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_le_u); }
    public static readonly instance = new I64LesserEqualUnsignedInstruction();
}
I64LesserEqualUnsignedInstruction.registerInstruction(OpCodes.i64_le_u);
export class I64GreaterEqualSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_ge_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_ge_s); }
    public static readonly instance = new I64GreaterEqualSignedInstruction();
}
I64GreaterEqualSignedInstruction.registerInstruction(OpCodes.i64_ge_s);
export class I64GreaterEqualUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_ge_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_ge_u); }
    public static readonly instance = new I64GreaterEqualUnsignedInstruction();
}
I64GreaterEqualUnsignedInstruction.registerInstruction(OpCodes.i64_ge_u);
export class I64LeadingBitsUnsigendInstruction extends AbstractNumericInstruction<OpCodes.i64_clz> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_clz); }
    public static readonly instance = new I64LeadingBitsUnsigendInstruction();
}
I64LeadingBitsUnsigendInstruction.registerInstruction(OpCodes.i64_clz);
export class I64TrailingBitsUnsigendInstruction extends AbstractNumericInstruction<OpCodes.i64_ctz> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_ctz); }
    public static readonly instance = new I64TrailingBitsUnsigendInstruction();
}
I64TrailingBitsUnsigendInstruction.registerInstruction(OpCodes.i64_ctz);
export class I64BitCountInstruction extends AbstractNumericInstruction<OpCodes.i64_popcnt> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_popcnt); }
    public static readonly instance = new I64BitCountInstruction();
}
I64BitCountInstruction.registerInstruction(OpCodes.i64_popcnt);
export class I64AddInstruction extends AbstractNumericInstruction<OpCodes.i64_add> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_add); }
    public static readonly instance = new I64AddInstruction();
}
I64AddInstruction.registerInstruction(OpCodes.i64_add);
export class I64SubtractInstruction extends AbstractNumericInstruction<OpCodes.i64_sub> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_sub); }
    public static readonly instance = new I64SubtractInstruction();
}
I64SubtractInstruction.registerInstruction(OpCodes.i64_sub);
export class I64MultiplyInstruction extends AbstractNumericInstruction<OpCodes.i64_mul> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_mul); }
    public static readonly instance = new I64MultiplyInstruction();
}
I64MultiplyInstruction.registerInstruction(OpCodes.i64_mul);
export class I64DivideSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_div_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_div_s); }
    public static readonly instance = new I64DivideSignedInstruction();
}
I64DivideSignedInstruction.registerInstruction(OpCodes.i64_div_s);
export class I64DivideUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_div_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_div_u); }
    public static readonly instance = new I64DivideUnsignedInstruction();
}
I64DivideUnsignedInstruction.registerInstruction(OpCodes.i64_div_u);
export class I64RemainderSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_rem_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_rem_s); }
    public static readonly instance = new I64RemainderSignedInstruction();
}
I64RemainderSignedInstruction.registerInstruction(OpCodes.i64_rem_s);
export class I64RemainderUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_rem_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_rem_u); }
    public static readonly instance = new I64RemainderUnsignedInstruction();
}
I64RemainderUnsignedInstruction.registerInstruction(OpCodes.i64_rem_u);
export class I64AndInstruction extends AbstractNumericInstruction<OpCodes.i64_and> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_and); }
    public static readonly instance = new I64AndInstruction();
}
I64AndInstruction.registerInstruction(OpCodes.i64_and);
export class I64OrInstruction extends AbstractNumericInstruction<OpCodes.i64_or> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_or); }
    public static readonly instance = new I64OrInstruction();
}
I64OrInstruction.registerInstruction(OpCodes.i64_or);
export class I64XOrInstruction extends AbstractNumericInstruction<OpCodes.i64_xor> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_xor); }
    public static readonly instance = new I64XOrInstruction();
}
I64XOrInstruction.registerInstruction(OpCodes.i64_xor);
export class I64BitShifLeftInstruction extends AbstractNumericInstruction<OpCodes.i64_shl> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_shl); }
    public static readonly instance = new I64BitShifLeftInstruction();
}
I64BitShifLeftInstruction.registerInstruction(OpCodes.i64_shl);
export class I64BitShifRightSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_shr_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_shr_s); }
    public static readonly instance = new I64BitShifRightSignedInstruction();
}
I64BitShifRightSignedInstruction.registerInstruction(OpCodes.i64_shr_s);
export class I64BitShifRightUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_shr_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_shr_u); }
    public static readonly instance = new I64BitShifRightUnsignedInstruction();
}
I64BitShifRightUnsignedInstruction.registerInstruction(OpCodes.i64_shr_u);
export class I64BitRotationLeftInstruction extends AbstractNumericInstruction<OpCodes.i64_rotl> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_rotl); }
    public static readonly instance = new I64BitRotationLeftInstruction();
}
I64BitRotationLeftInstruction.registerInstruction(OpCodes.i64_rotl);
export class I64BitRotationRightInstruction extends AbstractNumericInstruction<OpCodes.i64_rotr> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64, Types.Type.i64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_rotr); }
    public static readonly instance = new I64BitRotationRightInstruction();
}
I64BitRotationRightInstruction.registerInstruction(OpCodes.i64_rotr);
export class I64ExtendI32SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend_i32_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_extend_i32_s); }
    public static readonly instance = new I64ExtendI32SignedInstruction();
}
I64ExtendI32SignedInstruction.registerInstruction(OpCodes.i64_extend_i32_s);
export class I64ExtendI32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend_i32_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_extend_i32_u); }
    public static readonly instance = new I64ExtendI32UnsignedInstruction();
}
I64ExtendI32UnsignedInstruction.registerInstruction(OpCodes.i64_extend_i32_u);
export class I64TruncateF32SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_trunc_f32_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_trunc_f32_s); }
    public static readonly instance = new I64TruncateF32SignedInstruction();
}
I64TruncateF32SignedInstruction.registerInstruction(OpCodes.i64_trunc_f32_s);
export class I64TruncateF32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_trunc_f32_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_trunc_f32_u); }
    public static readonly instance = new I64TruncateF32UnsignedInstruction();
}
I64TruncateF32UnsignedInstruction.registerInstruction(OpCodes.i64_trunc_f32_u);
export class I64TruncateF64SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_trunc_f64_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_trunc_f64_s); }
    public static readonly instance = new I64TruncateF64SignedInstruction();
}
I64TruncateF64SignedInstruction.registerInstruction(OpCodes.i64_trunc_f64_s);
export class I64TruncateF64UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_trunc_f64_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_trunc_f64_u); }
    public static readonly instance = new I64TruncateF64UnsignedInstruction();
}
I64TruncateF64UnsignedInstruction.registerInstruction(OpCodes.i64_trunc_f64_u);
export class I64ReinterpretF64Instruction extends AbstractNumericInstruction<OpCodes.i64_reinterpret_f64> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_reinterpret_f64); }
    public static readonly instance = new I64ReinterpretF64Instruction();
}
I64ReinterpretF64Instruction.registerInstruction(OpCodes.i64_reinterpret_f64);
export class I64Extend8SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend8_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_extend8_s); }
    public static readonly instance = new I64Extend8SignedInstruction();
}
I64Extend8SignedInstruction.registerInstruction(OpCodes.i64_extend8_s);
export class I64Extend16SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend16_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_extend16_s); }
    public static readonly instance = new I64Extend16SignedInstruction();
}
I64Extend16SignedInstruction.registerInstruction(OpCodes.i64_extend16_s);
export class I64Extend32SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend32_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_extend32_s); }
    public static readonly instance = new I64Extend32SignedInstruction();
}
I64Extend32SignedInstruction.registerInstruction(OpCodes.i64_extend32_s);

export class F32EqualInstruction extends AbstractNumericInstruction<OpCodes.f32_eq> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32, Types.Type.f32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.f32_eq); }
    public static readonly instance = new F32EqualInstruction();
}
F32EqualInstruction.registerInstruction(OpCodes.f32_eq);
export class F32NotEqualInstruction extends AbstractNumericInstruction<OpCodes.f32_ne> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32, Types.Type.f32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.f32_ne); }
    public static readonly instance = new F32NotEqualInstruction();
}
F32NotEqualInstruction.registerInstruction(OpCodes.f32_ne);
export class F32LesserInstruction extends AbstractNumericInstruction<OpCodes.f32_lt> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32, Types.Type.f32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.f32_lt); }
    public static readonly instance = new F32LesserInstruction();
}
F32LesserInstruction.registerInstruction(OpCodes.f32_lt);
export class F32GreaterInstruction extends AbstractNumericInstruction<OpCodes.f32_gt> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32, Types.Type.f32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.f32_gt); }
    public static readonly instance = new F32GreaterInstruction();
}
F32GreaterInstruction.registerInstruction(OpCodes.f32_gt);
export class F32LesserEqualInstruction extends AbstractNumericInstruction<OpCodes.f32_le> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32, Types.Type.f32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.f32_le); }
    public static readonly instance = new F32LesserEqualInstruction();
}
F32LesserEqualInstruction.registerInstruction(OpCodes.f32_le);
export class F32GreaterEqualInstruction extends AbstractNumericInstruction<OpCodes.f32_ge> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32, Types.Type.f32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.f32_ge); }
    public static readonly instance = new F32GreaterEqualInstruction();
}
F32GreaterEqualInstruction.registerInstruction(OpCodes.f32_ge);
export class F32AbsoluteInstruction extends AbstractNumericInstruction<OpCodes.f32_abs> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_abs); }
    public static readonly instance = new F32AbsoluteInstruction();
}
F32AbsoluteInstruction.registerInstruction(OpCodes.f32_abs);
export class F32NegativeInstruction extends AbstractNumericInstruction<OpCodes.f32_neg> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_neg); }
    public static readonly instance = new F32NegativeInstruction();
}
F32NegativeInstruction.registerInstruction(OpCodes.f32_neg);
export class F32CeilInstruction extends AbstractNumericInstruction<OpCodes.f32_ceil> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_ceil); }
    public static readonly instance = new F32CeilInstruction();
}
F32CeilInstruction.registerInstruction(OpCodes.f32_ceil);
export class F32FloorInstruction extends AbstractNumericInstruction<OpCodes.f32_floor> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_floor); }
    public static readonly instance = new F32FloorInstruction();
}
F32FloorInstruction.registerInstruction(OpCodes.f32_floor);
export class F32TruncateInstruction extends AbstractNumericInstruction<OpCodes.f32_trunc> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_trunc); }
    public static readonly instance = new F32TruncateInstruction();
}
F32TruncateInstruction.registerInstruction(OpCodes.f32_trunc);
export class F32NearestInstruction extends AbstractNumericInstruction<OpCodes.f32_nearest> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_nearest); }
    public static readonly instance = new F32NearestInstruction();
}
F32NearestInstruction.registerInstruction(OpCodes.f32_nearest);
export class F32SquareRootInstruction extends AbstractNumericInstruction<OpCodes.f32_sqrt> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_sqrt); }
    public static readonly instance = new F32SquareRootInstruction();
}
F32SquareRootInstruction.registerInstruction(OpCodes.f32_sqrt);
export class F32AddInstruction extends AbstractNumericInstruction<OpCodes.f32_add> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32, Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_add); }
    public static readonly instance = new F32AddInstruction();
}
F32AddInstruction.registerInstruction(OpCodes.f32_add);
export class F32SubtractInstruction extends AbstractNumericInstruction<OpCodes.f32_sub> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32, Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_sub); }
    public static readonly instance = new F32SubtractInstruction();
}
F32SubtractInstruction.registerInstruction(OpCodes.f32_sub);
export class F32MultiplyInstruction extends AbstractNumericInstruction<OpCodes.f32_mul> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32, Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_mul); }
    public static readonly instance = new F32MultiplyInstruction();
}
F32MultiplyInstruction.registerInstruction(OpCodes.f32_mul);
export class F32DivideInstruction extends AbstractNumericInstruction<OpCodes.f32_div> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32, Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_div); }
    public static readonly instance = new F32DivideInstruction();
}
F32DivideInstruction.registerInstruction(OpCodes.f32_div);
export class F32MinInstruction extends AbstractNumericInstruction<OpCodes.f32_min> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32, Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_min); }
    public static readonly instance = new F32MinInstruction();
}
F32MinInstruction.registerInstruction(OpCodes.f32_min);
export class F32MaxInstruction extends AbstractNumericInstruction<OpCodes.f32_max> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32, Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_max); }
    public static readonly instance = new F32MaxInstruction();
}
F32MaxInstruction.registerInstruction(OpCodes.f32_max);
export class F32CopySignInstruction extends AbstractNumericInstruction<OpCodes.f32_copysign> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32, Types.Type.f32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_copysign); }
    public static readonly instance = new F32CopySignInstruction();
}
F32CopySignInstruction.registerInstruction(OpCodes.f32_copysign);
export class F32ConvertI32SignedInstruction extends AbstractNumericInstruction<OpCodes.f32_convert_i32_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_convert_i32_s); }
    public static readonly instance = new F32ConvertI32SignedInstruction();
}
F32ConvertI32SignedInstruction.registerInstruction(OpCodes.f32_convert_i32_s);
export class F32ConvertI32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.f32_convert_i32_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_convert_i32_u); }
    public static readonly instance = new F32ConvertI32UnsignedInstruction();
}
F32ConvertI32UnsignedInstruction.registerInstruction(OpCodes.f32_convert_i32_u);
export class F32ConvertI64SignedInstruction extends AbstractNumericInstruction<OpCodes.f32_convert_i64_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_convert_i64_s); }
    public static readonly instance = new F32ConvertI64SignedInstruction();
}
F32ConvertI64SignedInstruction.registerInstruction(OpCodes.f32_convert_i64_s);
export class F32ConvertI64UnsignedInstruction extends AbstractNumericInstruction<OpCodes.f32_convert_i64_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_convert_i64_u); }
    public static readonly instance = new F32ConvertI64UnsignedInstruction();
}
F32ConvertI64UnsignedInstruction.registerInstruction(OpCodes.f32_convert_i64_u);
export class F32DemoteF64Instruction extends AbstractNumericInstruction<OpCodes.f32_demote_f64> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_demote_f64); }
    public static readonly instance = new F32DemoteF64Instruction();
}
F32DemoteF64Instruction.registerInstruction(OpCodes.f32_demote_f64);
export class F32ReinterpretI32Instruction extends AbstractNumericInstruction<OpCodes.f32_reinterpret_i32> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_reinterpret_i32); }
    public static readonly instance = new F32ReinterpretI32Instruction();
}
F32ReinterpretI32Instruction.registerInstruction(OpCodes.f32_reinterpret_i32);

export class F64EqualInstruction extends AbstractNumericInstruction<OpCodes.f64_eq> {
    private constructor() { super(OpCodes.f64_eq); }
    public static readonly instance = new F64EqualInstruction();
}
F64EqualInstruction.registerInstruction(OpCodes.f64_eq);
export class F64NotEqualInstruction extends AbstractNumericInstruction<OpCodes.f64_ne> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64, Types.Type.f64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.f64_ne); }
    public static readonly instance = new F64NotEqualInstruction();
}
F64NotEqualInstruction.registerInstruction(OpCodes.f64_ne);
export class F64LesserInstruction extends AbstractNumericInstruction<OpCodes.f64_lt> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64, Types.Type.f64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.f64_lt); }
    public static readonly instance = new F64LesserInstruction();
}
F64LesserInstruction.registerInstruction(OpCodes.f64_lt);
export class F64GreaterInstruction extends AbstractNumericInstruction<OpCodes.f64_gt> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64, Types.Type.f64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.f64_gt); }
    public static readonly instance = new F64GreaterInstruction();
}
F64GreaterInstruction.registerInstruction(OpCodes.f64_gt);
export class F64LesserEqualInstruction extends AbstractNumericInstruction<OpCodes.f64_le> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64, Types.Type.f64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.f64_le); }
    public static readonly instance = new F64LesserEqualInstruction();
}
F64LesserEqualInstruction.registerInstruction(OpCodes.f64_le);
export class F64GreaterEqualInstruction extends AbstractNumericInstruction<OpCodes.f64_ge> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64, Types.Type.f64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodes.f64_ge); }
    public static readonly instance = new F64GreaterEqualInstruction();
}
F64GreaterEqualInstruction.registerInstruction(OpCodes.f64_ge);
export class F64AbsoluteInstruction extends AbstractNumericInstruction<OpCodes.f64_abs> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_abs); }
    public static readonly instance = new F64AbsoluteInstruction();
}
F64AbsoluteInstruction.registerInstruction(OpCodes.f64_abs);
export class F64NegativeInstruction extends AbstractNumericInstruction<OpCodes.f64_neg> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_neg); }
    public static readonly instance = new F64NegativeInstruction();
}
F64NegativeInstruction.registerInstruction(OpCodes.f64_neg);
export class F64CeilInstruction extends AbstractNumericInstruction<OpCodes.f64_ceil> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_ceil); }
    public static readonly instance = new F64CeilInstruction();
}
F64CeilInstruction.registerInstruction(OpCodes.f64_ceil);
export class F64FloorInstruction extends AbstractNumericInstruction<OpCodes.f64_floor> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_floor); }
    public static readonly instance = new F64FloorInstruction();
}
F64FloorInstruction.registerInstruction(OpCodes.f64_floor);
export class F64TruncateInstruction extends AbstractNumericInstruction<OpCodes.f64_trunc> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_trunc); }
    public static readonly instance = new F64TruncateInstruction();
}
F64TruncateInstruction.registerInstruction(OpCodes.f64_trunc);
export class F64NearestInstruction extends AbstractNumericInstruction<OpCodes.f64_nearest> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_nearest); }
    public static readonly instance = new F64NearestInstruction();
}
F64NearestInstruction.registerInstruction(OpCodes.f64_nearest);
export class F64SquareRootInstruction extends AbstractNumericInstruction<OpCodes.f64_sqrt> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_sqrt); }
    public static readonly instance = new F64SquareRootInstruction();
}
F64SquareRootInstruction.registerInstruction(OpCodes.f64_sqrt);
export class F64AddInstruction extends AbstractNumericInstruction<OpCodes.f64_add> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64, Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_add); }
    public static readonly instance = new F64AddInstruction();
}
F64AddInstruction.registerInstruction(OpCodes.f64_add);
export class F64SubtractInstruction extends AbstractNumericInstruction<OpCodes.f64_sub> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64, Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_sub); }
    public static readonly instance = new F64SubtractInstruction();
}
F64SubtractInstruction.registerInstruction(OpCodes.f64_sub);
export class F64MultiplyInstruction extends AbstractNumericInstruction<OpCodes.f64_mul> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64, Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_mul); }
    public static readonly instance = new F64MultiplyInstruction();
}
F64MultiplyInstruction.registerInstruction(OpCodes.f64_mul);
export class F64DivideInstruction extends AbstractNumericInstruction<OpCodes.f64_div> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64, Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_div); }
    public static readonly instance = new F64DivideInstruction();
}
F64DivideInstruction.registerInstruction(OpCodes.f64_div);
export class F64MinInstruction extends AbstractNumericInstruction<OpCodes.f64_min> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64, Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_min); }
    public static readonly instance = new F64MinInstruction();
}
F64MinInstruction.registerInstruction(OpCodes.f64_min);
export class F64MaxInstruction extends AbstractNumericInstruction<OpCodes.f64_max> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64, Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_max); }
    public static readonly instance = new F64MaxInstruction();
}
F64MaxInstruction.registerInstruction(OpCodes.f64_max);
export class F64CopySignInstruction extends AbstractNumericInstruction<OpCodes.f64_copysign> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64, Types.Type.f64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_copysign); }
    public static readonly instance = new F64CopySignInstruction();
}
F64CopySignInstruction.registerInstruction(OpCodes.f64_copysign);
export class F64ConvertI32SignedInstruction extends AbstractNumericInstruction<OpCodes.f64_convert_i32_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_convert_i32_s); }
    public static readonly instance = new F64ConvertI32SignedInstruction();
}
F64ConvertI32SignedInstruction.registerInstruction(OpCodes.f64_convert_i32_s);
export class F64ConvertI32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.f64_convert_i32_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_convert_i32_u); }
    public static readonly instance = new F64ConvertI32UnsignedInstruction();
}
F64ConvertI32UnsignedInstruction.registerInstruction(OpCodes.f64_convert_i32_u);
export class F64ConvertI64SignedInstruction extends AbstractNumericInstruction<OpCodes.f64_convert_i64_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_convert_i64_s); }
    public static readonly instance = new F64ConvertI64SignedInstruction();
}
F64ConvertI64SignedInstruction.registerInstruction(OpCodes.f64_convert_i64_s);
export class F64ConvertI64UnsignedInstruction extends AbstractNumericInstruction<OpCodes.f64_convert_i64_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_convert_i64_u); }
    public static readonly instance = new F64ConvertI64UnsignedInstruction();
}
F64ConvertI64UnsignedInstruction.registerInstruction(OpCodes.f64_convert_i64_u);
export class F64PromoteF32Instruction extends AbstractNumericInstruction<OpCodes.f64_promote_f32> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_promote_f32); }
    public static readonly instance = new F64PromoteF32Instruction();
}
F64PromoteF32Instruction.registerInstruction(OpCodes.f64_promote_f32);
export class F64ReinterpretI64Instruction extends AbstractNumericInstruction<OpCodes.f64_reinterpret_i64> {
    public override get stack(): StackEdit { return [ [ Types.Type.i64 ], [ Types.Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_reinterpret_i64); }
    public static readonly instance = new F64ReinterpretI64Instruction();
}
F64ReinterpretI64Instruction.registerInstruction(OpCodes.f64_reinterpret_i64);

export type NumericTruncateInstructionCodes =
    OpCodesExt1.i32_trunc_sat_f32_s | OpCodesExt1.i32_trunc_sat_f32_u |
    OpCodesExt1.i32_trunc_sat_f64_s | OpCodesExt1.i32_trunc_sat_f64_u |
    OpCodesExt1.i64_trunc_sat_f32_s | OpCodesExt1.i64_trunc_sat_f32_u |
    OpCodesExt1.i64_trunc_sat_f64_s | OpCodesExt1.i64_trunc_sat_f64_u; 
export abstract class NumericTruncateInstruction<O extends NumericTruncateInstructionCodes> extends AbstractNumericInstruction<OpCodes.op_extension_1> {
    public readonly OperationCode!: O;
    protected constructor(code: O) { super(OpCodes.op_extension_1); protect(this, 'OperationCode', code, true); }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode)
    }
}
export class I32TruncateSaturationF32SignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i32_trunc_sat_f32_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodesExt1.i32_trunc_sat_f32_s); }
    public static readonly instance = new I32TruncateSaturationF32SignedInstruction();
}
I32TruncateSaturationF32SignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i32_trunc_sat_f32_s);
export class I32TruncateSaturationF64SignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i32_trunc_sat_f64_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodesExt1.i32_trunc_sat_f64_s); }
    public static readonly instance = new I32TruncateSaturationF64SignedInstruction();
}
I32TruncateSaturationF64SignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i32_trunc_sat_f64_s);
export class I32TruncateSaturationF32UnsignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i32_trunc_sat_f32_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodesExt1.i32_trunc_sat_f32_u); }
    public static readonly instance = new I32TruncateSaturationF32UnsignedInstruction();
}
I32TruncateSaturationF32UnsignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i32_trunc_sat_f32_u);
export class I32TruncateSaturationF64UnsignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i32_trunc_sat_f64_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.i32 ] ] }
    private constructor() { super(OpCodesExt1.i32_trunc_sat_f64_u); }
    public static readonly instance = new I32TruncateSaturationF64UnsignedInstruction();
}
I32TruncateSaturationF64UnsignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i32_trunc_sat_f64_u);
export class I64TruncateSaturationF32SignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i64_trunc_sat_f32_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodesExt1.i64_trunc_sat_f32_s); }
    public static readonly instance = new I64TruncateSaturationF32SignedInstruction();
}
I64TruncateSaturationF32SignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i64_trunc_sat_f32_s);
export class I64TruncateSaturationF64SignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i64_trunc_sat_f64_s> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodesExt1.i64_trunc_sat_f64_s); }
    public static readonly instance = new I64TruncateSaturationF64SignedInstruction();
}
I64TruncateSaturationF64SignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i64_trunc_sat_f64_s);
export class I64TruncateSaturationF32UnsignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i64_trunc_sat_f32_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.f32 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodesExt1.i64_trunc_sat_f32_u); }
    public static readonly instance = new I64TruncateSaturationF32UnsignedInstruction();
}
I64TruncateSaturationF32UnsignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i64_trunc_sat_f32_u);
export class I64TruncateSaturationF64UnsignedInstruction extends NumericTruncateInstruction<OpCodesExt1.i64_trunc_sat_f64_u> {
    public override get stack(): StackEdit { return [ [ Types.Type.f64 ], [ Types.Type.i64 ] ] }
    private constructor() { super(OpCodesExt1.i64_trunc_sat_f64_u); }
    public static readonly instance = new I64TruncateSaturationF64UnsignedInstruction();
}
I64TruncateSaturationF64UnsignedInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.i64_trunc_sat_f64_u);


export const NumericInstruction = {
    I32: {
        EqualZero: I32EqualZeroInstruction.instance,
        Equal: I32EqualInstruction.instance,
        NotEqual: I32NotEqualInstruction.instance,
        TrailingBits: I32TrailingBitsUnsigendInstruction.instance,
        LeadingBits: I32LeadingBitsUnsigendInstruction.instance,
        BitCount: I32BitCountInstruction.instance,
        Add: I32AddInstruction.instance,
        Sub: I32SubtractInstruction.instance,
        Mul: I32MultiplyInstruction.instance,
        And: I32AndInstruction.instance,
        Or: I32OrInstruction.instance,
        XOr: I32XOrInstruction.instance,
        BitShiftLeft: I32BitShifLeftInstruction.instance,
        BitRotationLeft: I32BitRotationLeftInstruction.instance,
        BitRotationRight: I32BitRotationRightInstruction.instance,
        WrapI64: I32WrapI64Instruction.instance,
        Extend8: I32Extend8SignedInstruction.instance,
        Extend16: I32Extend16SignedInstruction.instance,
        ReinterpretF32: I32ReinterpretF32Instruction.instance,
        Signed: {
            Lesser: I32LesserSignedInstruction.instance,
            Greater: I32GreaterSignedInstruction.instance,
            LesserEqual: I32LesserEqualSignedInstruction.instance,
            GreaterEqual: I32GreaterEqualSignedInstruction.instance,
            Divide: I32DivideSignedInstruction.instance,
            Remainder: I32RemainderSignedInstruction.instance,
            BitShiftRight: I32BitShifRightSignedInstruction.instance,
            Truncate: {
                F32: I32TruncateF32SignedInstruction.instance,
                F64: I32TruncateF64SignedInstruction.instance,
                SatF32: I32TruncateSaturationF32SignedInstruction,
                SatF64: I32TruncateSaturationF64SignedInstruction,
            }
        },
        Unsigned: {
            Lesser: I32LesserUnsignedInstruction.instance,
            Greater: I32GreaterUnsignedInstruction.instance,
            LesserEqual: I32LesserEqualUnsignedInstruction.instance,
            GreaterEqual: I32GreaterEqualUnsignedInstruction.instance,
            Divide: I32DivideUnsignedInstruction.instance,
            Remainder: I32RemainderUnsignedInstruction.instance,
            BitShiftRight: I32BitShifRightUnsignedInstruction.instance,
            Truncate: {
                F32: I32TruncateF32UnsignedInstruction.instance,
                F64: I32TruncateF64UnsignedInstruction.instance,
                SatF32: I32TruncateSaturationF32UnsignedInstruction,
                SatF64: I32TruncateSaturationF64UnsignedInstruction,
            }
        }
    },
    I64: {
        EqualZero: I64EqualZeroInstruction.instance,
        Equal: I64EqualInstruction.instance,
        NotEqual: I64NotEqualInstruction.instance,
        TrailingBits: I64TrailingBitsUnsigendInstruction.instance,
        LeadingBits: I64LeadingBitsUnsigendInstruction.instance,
        BitCount: I64BitCountInstruction.instance,
        Add: I64AddInstruction.instance,
        Sub: I64SubtractInstruction.instance,
        Mul: I64MultiplyInstruction.instance,
        And: I64AndInstruction.instance,
        Or: I64OrInstruction.instance,
        XOr: I64XOrInstruction.instance,
        BitShiftLeft: I64BitShifLeftInstruction.instance,
        BitRotationLeft: I64BitRotationLeftInstruction.instance,
        BitRotationRight: I64BitRotationRightInstruction.instance,
        Extend8: I64Extend8SignedInstruction.instance,
        Extend16: I64Extend16SignedInstruction.instance,
        Extend32: I64Extend32SignedInstruction.instance,
        ReinterpretF64: I64ReinterpretF64Instruction.instance,
        Signed: {
            Lesser: I64LesserSignedInstruction.instance,
            Greater: I64GreaterSignedInstruction.instance,
            LesserEqual: I64LesserEqualSignedInstruction.instance,
            GreaterEqual: I64GreaterEqualSignedInstruction.instance,
            Divide: I64DivideSignedInstruction.instance,
            Remainder: I64RemainderSignedInstruction.instance,
            BitShiftRight: I64BitShifRightSignedInstruction.instance,
            TruncateF32: I64TruncateF32SignedInstruction.instance,
            TruncateF64: I64TruncateF64SignedInstruction.instance,
            ExtendI32: I64ExtendI32SignedInstruction.instance,
            Truncate: {
                F32: I64TruncateF32SignedInstruction.instance,
                F64: I64TruncateF64SignedInstruction.instance,
                SatF32: I64TruncateSaturationF32SignedInstruction,
                SatF64: I64TruncateSaturationF64SignedInstruction,
            }
        },
        Unsigned: {
            Lesser: I64LesserUnsignedInstruction.instance,
            Greater: I64GreaterUnsignedInstruction.instance,
            LesserEqual: I64LesserEqualUnsignedInstruction.instance,
            GreaterEqual: I64GreaterEqualUnsignedInstruction.instance,
            Divide: I64DivideUnsignedInstruction.instance,
            Remainder: I64RemainderUnsignedInstruction.instance,
            BitShiftRight: I64BitShifRightUnsignedInstruction.instance,
            ExtendI32: I64ExtendI32UnsignedInstruction.instance,
            Truncate: {
                F32: I64TruncateF32UnsignedInstruction.instance,
                F64: I64TruncateF64UnsignedInstruction.instance,
                SatF32: I64TruncateSaturationF32UnsignedInstruction,
                SatF64: I64TruncateSaturationF64UnsignedInstruction,
            }
        },
    },
    F32: {
        Equal: F32EqualInstruction.instance,
        NotEqual: F32NotEqualInstruction.instance,
        Lesser: F32LesserInstruction.instance,
        LesserEqual: F32LesserEqualInstruction.instance,
        Greater: F32GreaterInstruction.instance,
        GreaterEqual: F32GreaterEqualInstruction.instance,
        Absolute: F32AbsoluteInstruction.instance,
        Negative: F32NegativeInstruction.instance,
        Ceil: F32CeilInstruction.instance,
        Floor: F32FloorInstruction.instance,
        Truncate: F32TruncateInstruction.instance,
        Nearest: F32NearestInstruction.instance,
        SquareRoot: F32SquareRootInstruction.instance,
        Add: F32AddInstruction.instance,
        Sub: F32SubtractInstruction.instance,
        Mul: F32MultiplyInstruction.instance,
        Div: F32DivideInstruction.instance,
        Min: F32MinInstruction.instance,
        Max: F32MaxInstruction.instance,
        CopySign: F32CopySignInstruction.instance,
        Demote: F32DemoteF64Instruction.instance,
        ReinterpretI32: F32ReinterpretI32Instruction.instance,
        Convert: {
            I32: F32ConvertI32SignedInstruction.instance,
            UI32: F32ConvertI32UnsignedInstruction.instance,
            I64: F32ConvertI64SignedInstruction.instance,
            UI64: F32ConvertI64UnsignedInstruction.instance,
        }
    },
    F64: {
        Equal: F64EqualInstruction.instance,
        NotEqual: F64NotEqualInstruction.instance,
        Lesser: F64LesserInstruction.instance,
        LesserEqual: F64LesserEqualInstruction.instance,
        Greater: F64GreaterInstruction.instance,
        GreaterEqual: F64GreaterEqualInstruction.instance,
        Absolute: F64AbsoluteInstruction.instance,
        Negative: F64NegativeInstruction.instance,
        Ceil: F64CeilInstruction.instance,
        Floor: F64FloorInstruction.instance,
        Truncate: F64TruncateInstruction.instance,
        Nearest: F64NearestInstruction.instance,
        SquareRoot: F64SquareRootInstruction.instance,
        Add: F64AddInstruction.instance,
        Sub: F64SubtractInstruction.instance,
        Mul: F64MultiplyInstruction.instance,
        Div: F64DivideInstruction.instance,
        Min: F64MinInstruction.instance,
        Max: F64MaxInstruction.instance,
        CopySign: F64CopySignInstruction.instance,
        Promote: F64PromoteF32Instruction.instance,
        ReinterpretI64: F64ReinterpretI64Instruction.instance,
        Convert: {
            I32: F64ConvertI32SignedInstruction.instance,
            UI32: F64ConvertI32UnsignedInstruction.instance,
            I64: F64ConvertI64SignedInstruction.instance,
            UI64: F64ConvertI64UnsignedInstruction.instance,
        }
    }
}

export const AllInstructionsTypes = [
    UnreachableInstruction, NopInstruction, BlockInstruction, LoopInstruction, IfThenElseInstruction,
    BranchInstruction, BranchIfInstruction, BranchTableInstruction, ReturnInstruction, CallInstruction,
    CallIndirectInstruction, ReferenceNullInstruction, ReferenceIsNullInstruction, ReferenceFunctionInstruction,
    DropInstruction, SelectInstruction, SelectAllInstruction, LocalGetInstruction, LocalSetInstruction,
    LocalTeeInstruction, GlobalGetInstruction, GlobalSetInstruction, TableGetInstruction, TableSetInstruction,
    TableInitInstruction, ElementDropInstruction, TableCopyInstruction, TableGrowInstruction, TableSizeInstruction,
    TableFillInstruction, I32LoadInstruction, I64LoadInstruction, F32LoadInstruction, F64LoadInstruction,
    I32Load8SignedLoadInstruction, I32Load16SignedLoadInstruction, I64Load8SignedLoadInstruction,
    I64Load16SignedLoadInstruction, I64Load32SignedLoadInstruction, I32Load8UnsignedLoadInstruction,
    I32Load16UnsignedLoadInstruction, I64Load8UnsignedLoadInstruction, I64Load16UnsignedLoadInstruction,
    I64Load32UnsignedLoadInstruction, I32StoreInstruction, I64StoreInstruction,F32StoreInstruction,
    F64StoreInstruction, I32Store8Instruction, I32Store16Instruction, I64Store8Instruction,
    I64Store16Instruction, I64Store32Instruction, MemorySizeInstruction, MemoryGrowInstruction,
    MemoryInitInstruction, DataDropInstruction, MemoryCopyInstruction, MemoryFillInstruction,
    I32ConstInstruction, I64ConstInstruction, F32ConstInstruction, F64ConstInstruction,
    I32EqualZeroInstruction, I32EqualInstruction, I32NotEqualInstruction, I32LesserSignedInstruction,
    I32LesserUnsignedInstruction, I32GreaterSignedInstruction, I32GreaterUnsignedInstruction,
    I32LesserEqualSignedInstruction, I32LesserEqualUnsignedInstruction, I32GreaterEqualSignedInstruction,
    I32GreaterEqualUnsignedInstruction, I32LeadingBitsUnsigendInstruction, I32TrailingBitsUnsigendInstruction,
    I32BitCountInstruction, I32AddInstruction, I32SubtractInstruction, I32MultiplyInstruction,
    I32DivideSignedInstruction, I32DivideUnsignedInstruction, I32RemainderSignedInstruction,
    I32RemainderUnsignedInstruction, I32AndInstruction, I32OrInstruction, I32XOrInstruction,
    I32BitShifLeftInstruction, I32BitShifRightSignedInstruction, I32BitShifRightUnsignedInstruction,
    I32BitRotationLeftInstruction, I32BitRotationRightInstruction, I32WrapI64Instruction,
    I32TruncateF32SignedInstruction, I32TruncateF32UnsignedInstruction, I32TruncateF64SignedInstruction,
    I32TruncateF64UnsignedInstruction, I32ReinterpretF32Instruction, I32Extend8SignedInstruction,
    I32Extend16SignedInstruction, I64EqualZeroInstruction, I64EqualInstruction, I64NotEqualInstruction,
    I64LesserSignedInstruction, I64LesserUnsignedInstruction, I64GreaterSignedInstruction,
    I64GreaterUnsignedInstruction, I64LesserEqualSignedInstruction, I64LesserEqualUnsignedInstruction,
    I64GreaterEqualSignedInstruction, I64GreaterEqualUnsignedInstruction,I64LeadingBitsUnsigendInstruction,
    I64TrailingBitsUnsigendInstruction, I64BitCountInstruction, I64AddInstruction, I64SubtractInstruction,
    I64MultiplyInstruction, I64DivideSignedInstruction, I64DivideUnsignedInstruction, I64RemainderSignedInstruction,
    I64RemainderUnsignedInstruction, I64AndInstruction, I64OrInstruction, I64XOrInstruction,
    I64BitShifLeftInstruction, I64BitShifRightSignedInstruction, I64BitShifRightUnsignedInstruction,
    I64BitRotationLeftInstruction, I64BitRotationRightInstruction, I64ExtendI32SignedInstruction,
    I64ExtendI32UnsignedInstruction, I64TruncateF32SignedInstruction, I64TruncateF32UnsignedInstruction,
    I64TruncateF64SignedInstruction, I64TruncateF64UnsignedInstruction, I64ReinterpretF64Instruction,
    I64Extend8SignedInstruction, I64Extend16SignedInstruction, I64Extend32SignedInstruction,
    F32EqualInstruction, F32NotEqualInstruction, F32LesserInstruction, F32GreaterInstruction,
    F32LesserEqualInstruction, F32GreaterEqualInstruction, F32AbsoluteInstruction, F32NegativeInstruction,
    F32CeilInstruction, F32FloorInstruction, F32TruncateInstruction, F32NearestInstruction,
    F32SquareRootInstruction, F32AddInstruction, F32SubtractInstruction, F32MultiplyInstruction,
    F32DivideInstruction, F32MinInstruction, F32MaxInstruction, F32CopySignInstruction,
    F32ConvertI32SignedInstruction, F32ConvertI32UnsignedInstruction, F32ConvertI64SignedInstruction,
    F32ConvertI64UnsignedInstruction, F32DemoteF64Instruction, F32ReinterpretI32Instruction,
    F64EqualInstruction, F64NotEqualInstruction, F64LesserInstruction, F64GreaterInstruction,
    F64LesserEqualInstruction, F64GreaterEqualInstruction, F64AbsoluteInstruction,
    F64NegativeInstruction, F64CeilInstruction, F64FloorInstruction, F64TruncateInstruction,
    F64NearestInstruction, F64SquareRootInstruction, F64AddInstruction, F64SubtractInstruction,
    F64MultiplyInstruction, F64DivideInstruction, F64MinInstruction, F64MaxInstruction,
    F64CopySignInstruction, F64ConvertI32SignedInstruction, F64ConvertI32UnsignedInstruction,
    F64ConvertI64SignedInstruction, F64ConvertI64UnsignedInstruction, F64PromoteF32Instruction,
    F64ReinterpretI64Instruction, I32TruncateSaturationF32SignedInstruction, I32TruncateSaturationF64SignedInstruction,
    I32TruncateSaturationF32UnsignedInstruction, I32TruncateSaturationF64UnsignedInstruction, I64TruncateSaturationF32SignedInstruction,
    I64TruncateSaturationF64SignedInstruction, I64TruncateSaturationF32UnsignedInstruction, I64TruncateSaturationF64UnsignedInstruction
];