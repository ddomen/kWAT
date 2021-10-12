import { OpCodes, ForwardOpCodes } from '../OpCodes';
import { protect } from '../internal';
import type { IEncodable, IDecodable, IDecoder, IEncoder } from './Encoder';
import type { Module } from './Module';
import {
    ValueType,
    Types,
    FunctionType,
    TableType,
    ReferenceType
} from './Types';
import type { GlobalVariable, ElementSegment, DataSegment } from './Sections';

export class Expression implements IEncodable<Module> {

    public readonly Instructions!: Instruction[];
    
    public constructor(instructions: Instruction[]=[]) {
        protect(this, 'Instructions', instructions.slice(), true);
    }

    public encode(encoder: IEncoder, context: Module): void {
        encoder
            .array(this.Instructions, { expression: this, module: context })
            .uint8(OpCodes.end);
    }
    
    public static decode(decoder: IDecoder, context: Module): Expression {
        let exp = new Expression();
        while (decoder.peek() != OpCodes.end) {
            exp.Instructions.push(Instruction.decode(decoder, { expression: exp, module: context }));
        }
        return exp;
    }
}
type ExpressionModule = { expression: Expression, module: Module };

export type BlockTypeType = null | ValueType | FunctionType;
export class BlockType implements IEncodable<Module> {

    public Block: BlockTypeType;

    public constructor(block?: BlockTypeType) {
        this.Block = block || null;
    }

    public encode(encoder: IEncoder, context: Module): void {
        if (!this.Block) { encoder.uint8(0x40); }
        else if (this.Block instanceof FunctionType) {
            let index = context.TypeSection.Types.indexOf(this.Block);
            if (index < 0) { throw new Error('Invalid Block Type type reference'); }
            encoder.int32(index);
        }
        else { encoder.uint8(this.Block); }
    }

    public decode(decoder: IDecoder, context: Module): void {
        let header = decoder.peek();
        if (header === 0x40) { decoder.uint8(); }
        else if (header in Types) { this.Block = header; decoder.uint8(); }
        else {
            let index = decoder.int32();
            if (!context.TypeSection.Types[index]) {
                throw new Error('Invalid Block Type type reference');
            }
            this.Block = context.TypeSection.Types[index]!;
        }
    }

}

type Instructible<O extends OpCodes=OpCodes> = { instance: Instruction<O> } | IDecodable<Instruction<O>, [ ExpressionModule ]>;

export abstract class Instruction<O extends OpCodes=OpCodes> implements IEncodable<ExpressionModule> {
    public readonly Code!: O;
    protected constructor(code: O) { 
        protect(this, 'Code', code, true);
    }
    public getIndex(expression: Expression, pass?: boolean): number {
        let index = expression.Instructions.indexOf(this);
        if (!pass && index < 0) { throw new Error('Instruction not present in the current expression'); }
        return index;
    }
    public getLabel(encoder: IEncoder, context: ExpressionModule, pass?: boolean): number {
        let index = this.getIndex(context.expression, pass);
        if (!pass && index < 0) { throw new Error('Instruction not present in the current expression'); }
        else if (index < 0) { return -1; }
        let e = encoder.spawn().array(context.expression.Instructions.slice(0, index), context);
        return e.size;
    }
    public encode(encoder: IEncoder, _: ExpressionModule): void {
        encoder.uint8(this.Code);
    }

    private static readonly _instructionSet: { [key in OpCodes]?: Instructible } = { };
    private static readonly _forwardSet: { [key in ForwardOpCodes]?: Instructible } = { };

    public static registerInstruction(this: Instructible<OpCodes.look_forward>, key: OpCodes.look_forward, forward: ForwardOpCodes): void;
    public static registerInstruction<O extends Exclude<OpCodes, OpCodes.look_forward>>(this: Instructible<O>, key: O): void;
    public static registerInstruction<O extends OpCodes>(this: Instructible<O>, key: O, forward?: O extends OpCodes.look_forward ? ForwardOpCodes : never): void {
        if (key === OpCodes.look_forward) {
            if (!((forward || -1) in ForwardOpCodes)) { throw new Error('Invalid forward code ' + forward); }
            Instruction._forwardSet[forward!] = this;
        }
        else if (!(key in OpCodes)) { throw new Error('Invalid opcode ' + key); }
        else {
            Instruction._instructionSet[key] = this;
        }
    }
    public static decode(decoder: IDecoder, context: ExpressionModule): Instruction {
        let code: OpCodes = decoder.uint8();
        let ctor = Instruction._instructionSet[code];
        if (!ctor) { throw new Error('Unsupported Instruction code: ' + code); }
        if ('instance' in ctor && ctor.instance instanceof Instruction) { 
            return ctor.instance;
        }
        else if ('decode' in ctor && typeof(ctor.decode) === 'function') {
            return ctor.decode(decoder, context);
        }
        else { throw new Error('Unsupported Instruction code: ' + code); }
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

export type BlockTypeCodes = OpCodes.block | OpCodes.loop | OpCodes.if;
export abstract class AbstractBlockInstruction<O extends BlockTypeCodes> extends ControlInstruction<O> {
    public readonly Block!: BlockType;

    protected constructor(code: O) {
        super(code);
        protect(this, 'Block', new BlockType(), true);
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.encode(this.Block, context.module);
    }
}

export class BlockInstruction extends AbstractBlockInstruction<OpCodes.block> {
    private constructor() { super(OpCodes.block); }
    public static readonly instance = new BlockInstruction();
}
BlockInstruction.registerInstruction(OpCodes.block);
export class LoopInstruction extends AbstractBlockInstruction<OpCodes.loop> {
    private constructor() { super(OpCodes.loop); }
    public static readonly instance = new LoopInstruction();
}
LoopInstruction.registerInstruction(OpCodes.loop);
export class IfThenElseInstruction extends AbstractBlockInstruction<OpCodes.if> {
    public readonly Else!: BlockType;
    public get Then(): BlockType { return this.Block; }
    public constructor(elseBlock?: BlockTypeType) {
        super(OpCodes.if);
        protect(this, 'Else', new BlockType(elseBlock));
    }

    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        if (this.Else.Block) { encoder.uint8(0x05).encode(this.Else, context.module); }
    }

    public static override decode(decoder: IDecoder, context: ExpressionModule): IfThenElseInstruction {
        let ite = new IfThenElseInstruction();
        ite.Block.decode(decoder, context.module);
        if (decoder.remaining && decoder.peek() === 0x05) {
            decoder.uint8();
            ite.Else.decode(decoder, context.module);
        }
        return ite;
    }
}
IfThenElseInstruction.registerInstruction(OpCodes.if);

export type BranchInstructionCodes = OpCodes.br | OpCodes.br_if | OpCodes.br_table;
export abstract class AbstractBranchInstruction<O extends BranchInstructionCodes> extends Instruction<O> {
    public Target: Instruction;
    protected constructor(code: O, target: Instruction) {
        super(code);
        this.Target = target;
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        let index = this.Target.getLabel(encoder, context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
}

export class BranchInstruction extends AbstractBranchInstruction<OpCodes.br> {
    constructor(target: Instruction) { super(OpCodes.br, target); }
}
export class BranchIfInstruction extends AbstractBranchInstruction<OpCodes.br_if> {
    constructor(target: Instruction) { super(OpCodes.br_if, target); }
}
export class BranchTableInstruction extends AbstractBranchInstruction<OpCodes.br_table> {
    public readonly Targets!: Instruction[];
    constructor(end: Instruction, ...targets: Instruction[]) {
        super(OpCodes.br_table, end);
        protect(this, 'Targets', targets.slice(), true);
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        let idxs = this.Targets.map(t => t.getLabel(encoder, context)),
            idx = this.Target.getLabel(encoder, context);
        encoder
            .uint8(this.Code)
            .vector(idxs, 'uint32')
            .uint32(idx);
    }
}

export class ReturnInstruction extends ControlInstruction<OpCodes.return> {
    private constructor() { super(OpCodes.return); }
    public static readonly instance = new ReturnInstruction();
}
ReturnInstruction.registerInstruction(OpCodes.return);

export class AbstractCallInstruction<O extends OpCodes.call | OpCodes.call_indirect> extends ControlInstruction<O> { }

export class CallInstruction extends AbstractCallInstruction<OpCodes.call> {
    public Function: FunctionType;
    public constructor(fn: FunctionType) { super(OpCodes.call); this.Function = fn; }
    public getFunctionIndex(context: Module, pass?: boolean): number {
        let index = context.FunctionSection.Functions.indexOf(this.Function);
        if(!pass && index < 0) { throw new Error('Call Instruction invalid function pointer'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        let index = this.getFunctionIndex(context.module);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
}

export class CallIndirectInstruction extends AbstractCallInstruction<OpCodes.call_indirect> {
    public Type: FunctionType;
    public Table: TableType;
    public constructor(fn: FunctionType, table: TableType) {
        super(OpCodes.call_indirect);
        this.Type = fn;
        this.Table = table;
    }
    public getTypeIndex(context: Module, pass?: boolean): number {
        let index = context.TypeSection.Types.indexOf(this.Type);
        if(!pass && index < 0) { throw new Error('Call Indirect Instruction invalid type pointer'); }
        return index;
    }
    public getTableIndex(context: Module, pass?: boolean): number {
        let index = context.TableSection.Tables.indexOf(this.Table);
        if(!pass && index < 0) { throw new Error('Call Indirect Instruction invalid table pointer'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        let tid = this.getTypeIndex(context.module),
            xid = this.getTableIndex(context.module);
        super.encode(encoder, context);
        encoder.uint32(tid).uint32(xid);
    }
}

export type ReferenceInstructionCodes = OpCodes.ref_null | OpCodes.ref_func | OpCodes.ref_is_null;
export abstract class ReferenceInstruction<O extends ReferenceInstructionCodes> extends Instruction<O> { }

export class ReferenceNullInstruction extends ReferenceInstruction<OpCodes.ref_null> {
    public Type: ReferenceType;
    public constructor(type: ReferenceType) { super(OpCodes.ref_null); this.Type = type; }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.uint32(this.Type);
    }
}

export class ReferenceIsNullInstruction extends ReferenceInstruction<OpCodes.ref_is_null> {
    private constructor() { super(OpCodes.ref_is_null); }
    public static readonly instance = new ReferenceIsNullInstruction();
}

export class ReferenceFunctionInstruction extends ReferenceInstruction<OpCodes.ref_func> {
    public Function: FunctionType;
    public constructor(fn: FunctionType) { super(OpCodes.ref_func); this.Function = fn; }
    public getFunctionIndex(context: Module, pass?: boolean): number {
        let index = context.FunctionSection.Functions.indexOf(this.Function);
        if(!pass && index < 0) { throw new Error('Reference Instruction invalid function pointer'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        let index = this.getFunctionIndex(context.module);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
}

export type ParametricInstructionCodes = OpCodes.drop | OpCodes.select | OpCodes.select_t;
export abstract class ParametricInstruction<O extends ParametricInstructionCodes> extends Instruction<O> { }

export class DropInstruction extends ParametricInstruction<OpCodes.drop> {
    private constructor() { super(OpCodes.drop); }
    public static readonly instance = new DropInstruction();
}
export class SelectInstruction extends ParametricInstruction<OpCodes.select> {
    private constructor() { super(OpCodes.select); }
    public static readonly instance = new SelectInstruction();
}

export class SelectAllInstruction extends ParametricInstruction<OpCodes.select_t> {
    public readonly Values!: ValueType[];
    public constructor(values: ValueType[]) { super(OpCodes.select_t); protect(this, 'Values', values.slice(), true); }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.vector(this.Values, 'uint32');
    }
}

export type VariableInstructionCodes = OpCodes.local_get | OpCodes.local_set | OpCodes.local_tee | OpCodes.global_get | OpCodes.global_set;
export abstract class AbstractVariableInstruction<O extends VariableInstructionCodes> extends Instruction<O> { }
export abstract class LocalVariableInstruction<O extends OpCodes.local_get | OpCodes.local_set | OpCodes.local_tee>
    extends AbstractVariableInstruction<O> {
    public Variable: number;
    protected constructor(code: O, index: number) { super(code); this.Variable = index; }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.uint32(this.Variable);
    }
}
export class LocalGetInstruction extends LocalVariableInstruction<OpCodes.local_get> {
    public constructor(index: number) { super(OpCodes.local_get, index); }
}
export class LocalSetInstruction extends LocalVariableInstruction<OpCodes.local_set> {
    public constructor(index: number) { super(OpCodes.local_set, index); }
}
export class LocalTeeInstruction extends LocalVariableInstruction<OpCodes.local_tee> {
    public constructor(index: number) { super(OpCodes.local_tee, index); }
}
export abstract class GlobalVariableInstruction<O extends OpCodes.global_get | OpCodes.global_set>
    extends AbstractVariableInstruction<O> {
    public Variable: GlobalVariable;
    protected constructor(code: O, variable: GlobalVariable) { super(code); this.Variable = variable; }
    public getVariableIndex(context: Module, pass?: boolean): number {
        let index = context.GlobalSection.Globals.indexOf(this.Variable);
        if (!pass && index < 0) { throw new Error('Global Variable Instruction invalid variable reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        let index = this.getVariableIndex(context.module);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
}
export class GlobalGetInstruction extends GlobalVariableInstruction<OpCodes.global_get> {
    public constructor(variable: GlobalVariable) { super(OpCodes.global_get, variable); }
}
export class GlobalSetInstruction extends GlobalVariableInstruction<OpCodes.global_set> {
    public constructor(variable: GlobalVariable) { super(OpCodes.global_set, variable); }
}

export type TableInstructionCodes = OpCodes.table_get | OpCodes.table_set | OpCodes.look_forward;
export abstract class AbstractTableInstruction<O extends TableInstructionCodes> extends Instruction<O> { }

export class TableGetInstruction extends AbstractTableInstruction<OpCodes.table_get> {
    private constructor() { super(OpCodes.table_get); }
    public static readonly instance = new TableGetInstruction();
}
export class TableSetInstruction extends AbstractTableInstruction<OpCodes.table_set> {
    private constructor() { super(OpCodes.table_set); }
    public static readonly instance = new TableSetInstruction();
}

export abstract class TableInstruction<O extends ForwardOpCodes> extends AbstractTableInstruction<OpCodes.look_forward> {
    public readonly OperationCode!: O;
    public Table: TableType;
    protected constructor(code: O, table: TableType) {
        super(OpCodes.look_forward);
        protect(this, 'OperationCode', code, true);
        this.Table = table;
    }
    public getTableIndex(context: Module, pass?: boolean): number {
        let index = context.TableSection.Tables.indexOf(this.Table);
        if(!pass && index < 0) { throw new Error('Table Instruction invalid table pointer'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode);
    }
}
export class TableInitInstruction extends TableInstruction<ForwardOpCodes.table_init> {
    public Element: ElementSegment;
    public constructor(table: TableType, element: ElementSegment) { super(ForwardOpCodes.table_init, table); this.Element = element; }
    public getElementIndex(context: Module, pass?: boolean): number {
        let index = context.ElementSection.Elements.indexOf(this.Element);
        if(!pass && index < 0) { throw new Error('Table Init Instruction invalid element pointer'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        let elem = this.getElementIndex(context.module),
            table = this.getTableIndex(context.module);
        super.encode(encoder, context);
        encoder.uint32(elem).uint32(table);
    }
}
export class ElementDropInstruction extends TableInstruction<ForwardOpCodes.elem_drop> {
    public Element: ElementSegment;
    public constructor(element: ElementSegment) {
        super(ForwardOpCodes.elem_drop, null as any);
        this.Element = element;
    }
    public getElementIndex(context: Module, pass?: boolean): number {
        let index = context.ElementSection.Elements.indexOf(this.Element);
        if(!pass && index < 0) { throw new Error('Table Init Instruction invalid element pointer'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        let elem = this.getElementIndex(context.module);
        super.encode(encoder, context);
        encoder.uint32(elem);
    }
}
export class TableCopyInstruction extends TableInstruction<ForwardOpCodes.table_copy> {
    public Destination: TableType;
    public get Source(): TableType { return this.Table; }
    public set Source(value: TableType) { this.Table = value; }
    public constructor(table: TableType, destination: TableType) {
        super(ForwardOpCodes.table_copy, table);
        this.Destination = destination;
    }
    public getDestinationIndex(context: Module, pass?: boolean): number {
        let index = context.TableSection.Tables.indexOf(this.Destination);
        if(!pass && index < 0) { throw new Error('Table Instruction invalid destination table pointer'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        let dst = this.getDestinationIndex(context.module),
            src = this.getTableIndex(context.module);
        super.encode(encoder, context);
        encoder.uint32(src).uint32(dst);
    }
}
export abstract class TableOpInstruction<O extends ForwardOpCodes> extends TableInstruction<O> {
    protected constructor(code: O, table: TableType) { super(code, table); }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        let index = this.getTableIndex(context.module);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
}
export class TableGrowInstruction extends TableOpInstruction<ForwardOpCodes.table_grow> {
    public constructor(table: TableType) { super(ForwardOpCodes.table_grow, table); }
}
export class TableSizeInstruction extends TableOpInstruction<ForwardOpCodes.table_size> {
    public constructor(table: TableType) { super(ForwardOpCodes.table_size, table); }
}

export class TableFillInstruction extends TableOpInstruction<ForwardOpCodes.table_fill> {
    public constructor(table: TableType) { super(ForwardOpCodes.table_fill, table); }
}

export type MemoryInstructionCodes =
                OpCodes.i32_load | OpCodes.i64_load | OpCodes.f32_load | OpCodes.f64_load |
                OpCodes.i32_load8_s | OpCodes.i32_load8_u | OpCodes.i32_load16_s |
                OpCodes.i32_load16_u | OpCodes.i64_load8_s | OpCodes.i64_load8_u |
                OpCodes.i64_load16_s | OpCodes.i64_load16_u | OpCodes.i64_load32_s |
                OpCodes.i64_load32_u | OpCodes.i32_store | OpCodes.i64_store |
                OpCodes.f32_store | OpCodes.f64_store | OpCodes.i32_store8 |
                OpCodes.i32_store16 | OpCodes.i64_store8 | OpCodes.i64_store16 |
                OpCodes.i64_store32 | OpCodes.memory_size | OpCodes.memory_grow |
                OpCodes.look_forward;



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
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.uint32(this.Align).uint32(this.Offset);
    }
}
export abstract class MemoryLoadInstruction<O extends MemoryLoadInstructionCodes> extends MemoryManagementInstruction<O> {}
export abstract class MemoryStoreInstruction<O extends MemoryStoreInstructionCodes> extends MemoryManagementInstruction<O> {}
export class I32LoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load> {
    private constructor() { super(OpCodes.i32_load); }
    public static readonly instance = new I32LoadInstruction();
}
export class I64LoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load> {
    private constructor() { super(OpCodes.i64_load); }
    public static readonly instance = new I64LoadInstruction();
}
export class F32LoadInstruction extends MemoryLoadInstruction<OpCodes.f32_load> {
    private constructor() { super(OpCodes.f32_load); }
    public static readonly instance = new F32LoadInstruction();
}
export class F64LoadInstruction extends MemoryLoadInstruction<OpCodes.f64_load> {
    private constructor() { super(OpCodes.f64_load); }
    public static readonly instance = new F64LoadInstruction();
}
export class I32Load8SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load8_s> {
    private constructor() { super(OpCodes.i32_load8_s); }
    public static readonly instance = new I32Load8SignedLoadInstruction();
}
export class I32Load16SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load16_s> {
    private constructor() { super(OpCodes.i32_load16_s); }
    public static readonly instance = new I32Load16SignedLoadInstruction();
}
export class I64Load8SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load8_s> {
    private constructor() { super(OpCodes.i64_load8_s); }
    public static readonly instance = new I64Load8SignedLoadInstruction();
}
export class I64Load16SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load16_s> {
    private constructor() { super(OpCodes.i64_load16_s); }
    public static readonly instance = new I64Load16SignedLoadInstruction();
}
export class I64Load32SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load32_s> {
    private constructor() { super(OpCodes.i64_load32_s); }
    public static readonly instance = new I64Load32SignedLoadInstruction();
}
export class I32Load8UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load8_u> {
    private constructor() { super(OpCodes.i32_load8_u); }
    public static readonly instance = new I32Load8UnsignedLoadInstruction();
}
export class I32Load16UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load16_u> {
    private constructor() { super(OpCodes.i32_load16_u); }
    public static readonly instance = new I32Load16UnsignedLoadInstruction();
}
export class I64Load8UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load8_u> {
    private constructor() { super(OpCodes.i64_load8_u); }
    public static readonly instance = new I64Load8UnsignedLoadInstruction();
}
export class I64Load16UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load16_u> {
    private constructor() { super(OpCodes.i64_load16_u); }
    public static readonly instance = new I64Load16UnsignedLoadInstruction();
}
export class I64Load32UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load32_u> {
    private constructor() { super(OpCodes.i64_load32_u); }
    public static readonly instance = new I64Load32UnsignedLoadInstruction();
}

export class I32StoreInstruction extends MemoryStoreInstruction<OpCodes.i32_store> {
    private constructor() { super(OpCodes.i32_store); }
    public static readonly instance = new I32StoreInstruction();
}
export class I64StoreInstruction extends MemoryStoreInstruction<OpCodes.i64_store> {
    private constructor() { super(OpCodes.i64_store); }
    public static readonly instance = new I64StoreInstruction();
}
export class F32StoreInstruction extends MemoryStoreInstruction<OpCodes.f32_store> {
    private constructor() { super(OpCodes.f32_store); }
    public static readonly instance = new F32StoreInstruction();
}
export class F64StoreInstruction extends MemoryStoreInstruction<OpCodes.f64_store> {
    private constructor() { super(OpCodes.f64_store); }
    public static readonly instance = new F64StoreInstruction();
}
export class I32Store8Instruction extends MemoryStoreInstruction<OpCodes.i32_store8> {
    private constructor() { super(OpCodes.i32_store8); }
    public static readonly instance = new I32Store8Instruction();
}
export class I32Store16Instruction extends MemoryStoreInstruction<OpCodes.i32_store16> {
    private constructor() { super(OpCodes.i32_store16); }
    public static readonly instance = new I32Store16Instruction();
}
export class I64Store8Instruction extends MemoryStoreInstruction<OpCodes.i64_store8> {
    private constructor() { super(OpCodes.i64_store8); }
    public static readonly instance = new I64Store8Instruction();
}
export class I64Store16Instruction extends MemoryStoreInstruction<OpCodes.i64_store16> {
    private constructor() { super(OpCodes.i64_store16); }
    public static readonly instance = new I64Store16Instruction();
}
export class I64Store32Instruction extends MemoryStoreInstruction<OpCodes.i64_store32> {
    private constructor() { super(OpCodes.i64_store32); }
    public static readonly instance = new I64Store32Instruction();
}

export class MemorySizeInstruction extends AbstractMemoryInstruction<OpCodes.memory_size> {
    private constructor() { super(OpCodes.memory_size); }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.uint8(0x00);
    }
    public static readonly instance = new MemorySizeInstruction();
}
export class MemoryGrowInstruction extends AbstractMemoryInstruction<OpCodes.memory_grow> {
    private constructor() { super(OpCodes.memory_grow); }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.uint8(0x00);
    }
    public static readonly instance = new MemoryGrowInstruction();
}

export class MemoryInitInstruction extends AbstractMemoryInstruction<OpCodes.look_forward> {
    public readonly OperationCode!: ForwardOpCodes.memory_init;
    public Data: DataSegment;
    public constructor(data: DataSegment) {
        super(OpCodes.look_forward);
        protect(this, 'OperationCode', ForwardOpCodes.memory_init, true);
        this.Data = data;
    }
    public getDataIndex(context: Module, pass?: boolean): number {
        let index = context.DataSection.Datas.indexOf(this.Data);
        if (!pass && index < 0) { throw new Error('Memory Init Instruction invalid data reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        let index = this.getDataIndex(context.module);
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode).uint32(index).uint8(0x00);
    }
}
export class DataDropInstruction extends AbstractMemoryInstruction<OpCodes.look_forward> {
    public readonly OperationCode!: ForwardOpCodes.data_drop;
    public Data: DataSegment;
    public constructor(data: DataSegment) {
        super(OpCodes.look_forward);
        protect(this, 'OperationCode', ForwardOpCodes.data_drop, true);
        this.Data = data;
    }
    public getDataIndex(context: Module, pass?: boolean): number {
        let index = context.DataSection.Datas.indexOf(this.Data);
        if (!pass && index < 0) { throw new Error('Memory Init Instruction invalid data reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        let index = this.getDataIndex(context.module);
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode).uint32(index);
    }
}
export class MemoryCopyInstruction extends AbstractMemoryInstruction<OpCodes.look_forward> {
    public readonly OperationCode!: ForwardOpCodes.memory_copy;
    public constructor() {
        super(OpCodes.look_forward);
        protect(this, 'OperationCode', ForwardOpCodes.memory_copy, true);
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode).uint8(0x00).uint8(0x00);
    }
    public static readonly instance = new MemoryCopyInstruction();
}
export class MemoryFillInstruction extends AbstractMemoryInstruction<OpCodes.look_forward> {
    public readonly OperationCode!: ForwardOpCodes.memory_fill;
    public constructor() {
        super(OpCodes.look_forward);
        protect(this, 'OperationCode', ForwardOpCodes.memory_fill, true);
    }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode).uint8(0x00);
    }
    public static readonly instance = new MemoryFillInstruction();
}

export abstract class AbstractNumericInstruction<O extends OpCodes> extends Instruction<O> { }

export type NumericConstInstructionCodes = OpCodes.i32_const | OpCodes.i64_const | OpCodes.f32_const | OpCodes.f64_const;
export abstract class NumericConstInstruction<O extends NumericConstInstructionCodes> extends AbstractNumericInstruction<O> {
    public Value: number;
    protected constructor(code: O, value: number) { super(code); this.Value = value; }
}
export class I32ConstInstruction extends NumericConstInstruction<OpCodes.i32_const> {
    public constructor(value: number = 0) {super(OpCodes.i32_const, value); }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.uint32(this.Value | 0)
    }

    public static override decode(decoder: IDecoder): I32ConstInstruction {
        return new I32ConstInstruction(decoder.uint32());
    }
}
I32ConstInstruction.registerInstruction(OpCodes.i32_const);
export class I64ConstInstruction extends NumericConstInstruction<OpCodes.i64_const> {
    public constructor(value: number = 0) {super(OpCodes.i64_const, value); }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.uint64(this.Value)
    }
}
export class F32ConstInstruction extends NumericConstInstruction<OpCodes.f32_const> {
    public constructor(value: number = 0) {super(OpCodes.f32_const, value); }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.float32(this.Value)
    }
}
export class F64ConstInstruction extends NumericConstInstruction<OpCodes.f64_const> {
    public constructor(value: number = 0) { super(OpCodes.f64_const, value); }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.float64(this.Value)
    }
}

export class I32EqualZeroInstruction extends AbstractNumericInstruction<OpCodes.i32_eqz> {
    private constructor() { super(OpCodes.i32_eqz); }
    public static readonly instance = new I32EqualZeroInstruction();
}
export class I32EqualInstruction extends AbstractNumericInstruction<OpCodes.i32_eq> {
    private constructor() { super(OpCodes.i32_eq); }
    public static readonly instance = new I32EqualInstruction();
}
export class I32NotEqualInstruction extends AbstractNumericInstruction<OpCodes.i32_ne> {
    private constructor() { super(OpCodes.i32_ne); }
    public static readonly instance = new I32NotEqualInstruction();
}
export class I32LesserSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_lt_s> {
    private constructor() { super(OpCodes.i32_lt_s); }
    public static readonly instance = new I32LesserSignedInstruction();
}
export class I32LesserUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_lt_u> {
    private constructor() { super(OpCodes.i32_lt_u); }
    public static readonly instance = new I32LesserUnsignedInstruction();
}
export class I32GreaterSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_gt_s> {
    private constructor() { super(OpCodes.i32_gt_s); }
    public static readonly instance = new I32GreaterSignedInstruction();
}
export class I32GreaterUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_gt_u> {
    private constructor() { super(OpCodes.i32_gt_u); }
    public static readonly instance = new I32GreaterUnsignedInstruction();
}
export class I32LesserEqualSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_le_s> {
    private constructor() { super(OpCodes.i32_le_s); }
    public static readonly instance = new I32LesserEqualSignedInstruction();
}
export class I32LesserEqualUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_le_u> {
    private constructor() { super(OpCodes.i32_le_u); }
    public static readonly instance = new I32LesserEqualUnsignedInstruction();
}
export class I32GreaterEqualSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_ge_s> {
    private constructor() { super(OpCodes.i32_ge_s); }
    public static readonly instance = new I32GreaterEqualSignedInstruction();
}
export class I32GreaterEqualUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_ge_u> {
    private constructor() { super(OpCodes.i32_ge_u); }
    public static readonly instance = new I32GreaterEqualUnsignedInstruction();
}
export class I32LeadingBitsUnsigendInstruction extends AbstractNumericInstruction<OpCodes.i32_clz> {
    private constructor() { super(OpCodes.i32_clz); }
    public static readonly instance = new I32LeadingBitsUnsigendInstruction();
}
export class I32TrailingBitsUnsigendInstruction extends AbstractNumericInstruction<OpCodes.i32_ctz> {
    private constructor() { super(OpCodes.i32_ctz); }
    public static readonly instance = new I32TrailingBitsUnsigendInstruction();
}
export class I32BitCountInstruction extends AbstractNumericInstruction<OpCodes.i32_popcnt> {
    private constructor() { super(OpCodes.i32_popcnt); }
    public static readonly instance = new I32BitCountInstruction();
}
export class I32AddInstruction extends AbstractNumericInstruction<OpCodes.i32_add> {
    private constructor() { super(OpCodes.i32_add); }
    public static readonly instance = new I32AddInstruction();
}
export class I32SubtractInstruction extends AbstractNumericInstruction<OpCodes.i32_sub> {
    private constructor() { super(OpCodes.i32_sub); }
    public static readonly instance = new I32SubtractInstruction();
}
export class I32MultiplyInstruction extends AbstractNumericInstruction<OpCodes.i32_mul> {
    private constructor() { super(OpCodes.i32_mul); }
    public static readonly instance = new I32MultiplyInstruction();
}
export class I32DivideSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_div_s> {
    private constructor() { super(OpCodes.i32_div_s); }
    public static readonly instance = new I32DivideSignedInstruction();
}
export class I32DivideUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_div_u> {
    private constructor() { super(OpCodes.i32_div_u); }
    public static readonly instance = new I32DivideUnsignedInstruction();
}
export class I32RemainderSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_rem_s> {
    private constructor() { super(OpCodes.i32_rem_s); }
    public static readonly instance = new I32RemainderSignedInstruction();
}
export class I32RemainderUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_rem_u> {
    private constructor() { super(OpCodes.i32_rem_u); }
    public static readonly instance = new I32RemainderUnsignedInstruction();
}
export class I32AndInstruction extends AbstractNumericInstruction<OpCodes.i32_and> {
    private constructor() { super(OpCodes.i32_and); }
    public static readonly instance = new I32AndInstruction();
}
export class I32OrInstruction extends AbstractNumericInstruction<OpCodes.i32_or> {
    private constructor() { super(OpCodes.i32_or); }
    public static readonly instance = new I32OrInstruction();
}
export class I32XOrInstruction extends AbstractNumericInstruction<OpCodes.i32_xor> {
    private constructor() { super(OpCodes.i32_xor); }
    public static readonly instance = new I32XOrInstruction();
}
export class I32BitShifLeftInstruction extends AbstractNumericInstruction<OpCodes.i32_shl> {
    private constructor() { super(OpCodes.i32_shl); }
    public static readonly instance = new I32BitShifLeftInstruction();
}
export class I32BitShifRightSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_shr_s> {
    private constructor() { super(OpCodes.i32_shr_s); }
    public static readonly instance = new I32BitShifRightSignedInstruction();
}
export class I32BitShifRightUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_shr_u> {
    private constructor() { super(OpCodes.i32_shr_u); }
    public static readonly instance = new I32BitShifRightUnsignedInstruction();
}
export class I32BitRotationLeftInstruction extends AbstractNumericInstruction<OpCodes.i32_rotl> {
    private constructor() { super(OpCodes.i32_rotl); }
    public static readonly instance = new I32BitRotationLeftInstruction();
}
export class I32BitRotationRightInstruction extends AbstractNumericInstruction<OpCodes.i32_rotr> {
    private constructor() { super(OpCodes.i32_rotr); }
    public static readonly instance = new I32BitRotationRightInstruction();
}
export class I32WrapI64Instruction extends AbstractNumericInstruction<OpCodes.i32_wrap_i64> {
    private constructor() { super(OpCodes.i32_wrap_i64); }
    public static readonly instance = new I32WrapI64Instruction();
}
export class I32TruncateF32SignedInstruction extends AbstractNumericInstruction<OpCodes.i32_trunc_f32_s> {
    private constructor() { super(OpCodes.i32_trunc_f32_s); }
    public static readonly instance = new I32TruncateF32SignedInstruction();
}
export class I32TruncateF32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_trunc_f32_u> {
    private constructor() { super(OpCodes.i32_trunc_f32_u); }
    public static readonly instance = new I32TruncateF32UnsignedInstruction();
}
export class I32TruncateF64SignedInstruction extends AbstractNumericInstruction<OpCodes.i32_trunc_f64_s> {
    private constructor() { super(OpCodes.i32_trunc_f64_s); }
    public static readonly instance = new I32TruncateF64SignedInstruction();
}
export class I32TruncateF64UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_trunc_f64_u> {
    private constructor() { super(OpCodes.i32_trunc_f64_u); }
    public static readonly instance = new I32TruncateF64UnsignedInstruction();
}
export class I32ReinterpretF32Instruction extends AbstractNumericInstruction<OpCodes.i32_reinterpret_f32> {
    private constructor() { super(OpCodes.i32_reinterpret_f32); }
    public static readonly instance = new I32ReinterpretF32Instruction();
}
export class I32Extend8SignedInstruction extends AbstractNumericInstruction<OpCodes.i32_extend8_s> {
    private constructor() { super(OpCodes.i32_extend8_s); }
    public static readonly instance = new I32Extend8SignedInstruction();
}
export class I32Extend16SignedInstruction extends AbstractNumericInstruction<OpCodes.i32_extend16_s> {
    private constructor() { super(OpCodes.i32_extend16_s); }
    public static readonly instance = new I32Extend16SignedInstruction();
}

export class I64EqualZeroInstruction extends AbstractNumericInstruction<OpCodes.i64_eqz> {
    private constructor() { super(OpCodes.i64_eqz); }
    public static readonly instance = new I64EqualZeroInstruction();
}
export class I64EqualInstruction extends AbstractNumericInstruction<OpCodes.i64_eq> {
    private constructor() { super(OpCodes.i64_eq); }
    public static readonly instance = new I64EqualInstruction();
}
export class I64NotEqualInstruction extends AbstractNumericInstruction<OpCodes.i64_ne> {
    private constructor() { super(OpCodes.i64_ne); }
    public static readonly instance = new I64NotEqualInstruction();
}
export class I64LesserSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_lt_s> {
    private constructor() { super(OpCodes.i64_lt_s); }
    public static readonly instance = new I64LesserSignedInstruction();
}
export class I64LesserUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_lt_u> {
    private constructor() { super(OpCodes.i64_lt_u); }
    public static readonly instance = new I64LesserUnsignedInstruction();
}
export class I64GreaterSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_gt_s> {
    private constructor() { super(OpCodes.i64_gt_s); }
    public static readonly instance = new I64GreaterSignedInstruction();
}
export class I64GreaterUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_gt_u> {
    private constructor() { super(OpCodes.i64_gt_u); }
    public static readonly instance = new I64GreaterUnsignedInstruction();
}
export class I64LesserEqualSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_le_s> {
    private constructor() { super(OpCodes.i64_le_s); }
    public static readonly instance = new I64LesserEqualSignedInstruction();
}
export class I64LesserEqualUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_le_u> {
    private constructor() { super(OpCodes.i64_le_u); }
    public static readonly instance = new I64LesserEqualUnsignedInstruction();
}
export class I64GreaterEqualSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_ge_s> {
    private constructor() { super(OpCodes.i64_ge_s); }
    public static readonly instance = new I64GreaterEqualSignedInstruction();
}
export class I64GreaterEqualUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_ge_u> {
    private constructor() { super(OpCodes.i64_ge_u); }
    public static readonly instance = new I64GreaterEqualUnsignedInstruction();
}
export class I64LeadingBitsUnsigendInstruction extends AbstractNumericInstruction<OpCodes.i64_clz> {
    private constructor() { super(OpCodes.i64_clz); }
    public static readonly instance = new I64LeadingBitsUnsigendInstruction();
}
export class I64TrailingBitsUnsigendInstruction extends AbstractNumericInstruction<OpCodes.i64_ctz> {
    private constructor() { super(OpCodes.i64_ctz); }
    public static readonly instance = new I64TrailingBitsUnsigendInstruction();
}
export class I64BitCountInstruction extends AbstractNumericInstruction<OpCodes.i64_popcnt> {
    private constructor() { super(OpCodes.i64_popcnt); }
    public static readonly instance = new I64BitCountInstruction();
}
export class I64AddInstruction extends AbstractNumericInstruction<OpCodes.i64_add> {
    private constructor() { super(OpCodes.i64_add); }
    public static readonly instance = new I64AddInstruction();
}
export class I64SubtractInstruction extends AbstractNumericInstruction<OpCodes.i64_sub> {
    private constructor() { super(OpCodes.i64_sub); }
    public static readonly instance = new I64SubtractInstruction();
}
export class I64MultiplyInstruction extends AbstractNumericInstruction<OpCodes.i64_mul> {
    private constructor() { super(OpCodes.i64_mul); }
    public static readonly instance = new I64MultiplyInstruction();
}
export class I64DivideSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_div_s> {
    private constructor() { super(OpCodes.i64_div_s); }
    public static readonly instance = new I64DivideSignedInstruction();
}
export class I64DivideUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_div_u> {
    private constructor() { super(OpCodes.i64_div_u); }
    public static readonly instance = new I64DivideUnsignedInstruction();
}
export class I64RemainderSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_rem_s> {
    private constructor() { super(OpCodes.i64_rem_s); }
    public static readonly instance = new I64RemainderSignedInstruction();
}
export class I64RemainderUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_rem_u> {
    private constructor() { super(OpCodes.i64_rem_u); }
    public static readonly instance = new I64RemainderUnsignedInstruction();
}
export class I64AndInstruction extends AbstractNumericInstruction<OpCodes.i64_and> {
    private constructor() { super(OpCodes.i64_and); }
    public static readonly instance = new I64AndInstruction();
}
export class I64OrInstruction extends AbstractNumericInstruction<OpCodes.i64_or> {
    private constructor() { super(OpCodes.i64_or); }
    public static readonly instance = new I64OrInstruction();
}
export class I64XOrInstruction extends AbstractNumericInstruction<OpCodes.i64_xor> {
    private constructor() { super(OpCodes.i64_xor); }
    public static readonly instance = new I64XOrInstruction();
}
export class I64BitShifLeftInstruction extends AbstractNumericInstruction<OpCodes.i64_shl> {
    private constructor() { super(OpCodes.i64_shl); }
    public static readonly instance = new I64BitShifLeftInstruction();
}
export class I64BitShifRightSignedInstruction extends AbstractNumericInstruction<OpCodes.i64_shr_s> {
    private constructor() { super(OpCodes.i64_shr_s); }
    public static readonly instance = new I64BitShifRightSignedInstruction();
}
export class I64BitShifRightUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_shr_u> {
    private constructor() { super(OpCodes.i64_shr_u); }
    public static readonly instance = new I64BitShifRightUnsignedInstruction();
}
export class I64BitRotationLeftInstruction extends AbstractNumericInstruction<OpCodes.i64_rotl> {
    private constructor() { super(OpCodes.i64_rotl); }
    public static readonly instance = new I64BitRotationLeftInstruction();
}
export class I64BitRotationRightInstruction extends AbstractNumericInstruction<OpCodes.i64_rotr> {
    private constructor() { super(OpCodes.i64_rotr); }
    public static readonly instance = new I64BitRotationRightInstruction();
}
export class I64ExtendI32SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend_i32_s> {
    private constructor() { super(OpCodes.i64_extend_i32_s); }
    public static readonly instance = new I64ExtendI32SignedInstruction();
}
export class I64ExtendI32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend_i32_u> {
    private constructor() { super(OpCodes.i64_extend_i32_u); }
    public static readonly instance = new I64ExtendI32UnsignedInstruction();
}
export class I64TruncateF32SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_trunc_f32_s> {
    private constructor() { super(OpCodes.i64_trunc_f32_s); }
    public static readonly instance = new I64TruncateF32SignedInstruction();
}
export class I64TruncateF32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_trunc_f32_u> {
    private constructor() { super(OpCodes.i64_trunc_f32_u); }
    public static readonly instance = new I64TruncateF32UnsignedInstruction();
}
export class I64TruncateF64SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_trunc_f64_s> {
    private constructor() { super(OpCodes.i64_trunc_f64_s); }
    public static readonly instance = new I64TruncateF64SignedInstruction();
}
export class I64TruncateF64UnsignedInstruction extends AbstractNumericInstruction<OpCodes.i64_trunc_f64_u> {
    private constructor() { super(OpCodes.i64_trunc_f64_u); }
    public static readonly instance = new I64TruncateF64UnsignedInstruction();
}
export class I64ReinterpretF64Instruction extends AbstractNumericInstruction<OpCodes.i64_reinterpret_f64> {
    private constructor() { super(OpCodes.i64_reinterpret_f64); }
    public static readonly instance = new I64ReinterpretF64Instruction();
}
export class I64Extend8SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend8_s> {
    private constructor() { super(OpCodes.i64_extend8_s); }
    public static readonly instance = new I64Extend8SignedInstruction();
}
export class I64Extend16SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend16_s> {
    private constructor() { super(OpCodes.i64_extend16_s); }
    public static readonly instance = new I64Extend16SignedInstruction();
}
export class I64Extend32SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend32_s> {
    private constructor() { super(OpCodes.i64_extend32_s); }
    public static readonly instance = new I64Extend32SignedInstruction();
}

export class F32EqualInstruction extends AbstractNumericInstruction<OpCodes.f32_eq> {
    private constructor() { super(OpCodes.f32_eq); }
    public static readonly instance = new F32EqualInstruction();
}
export class F32NotEqualInstruction extends AbstractNumericInstruction<OpCodes.f32_ne> {
    private constructor() { super(OpCodes.f32_ne); }
    public static readonly instance = new F32NotEqualInstruction();
}
export class F32LesserInstruction extends AbstractNumericInstruction<OpCodes.f32_lt> {
    private constructor() { super(OpCodes.f32_lt); }
    public static readonly instance = new F32LesserInstruction();
}
export class F32GreaterInstruction extends AbstractNumericInstruction<OpCodes.f32_gt> {
    private constructor() { super(OpCodes.f32_gt); }
    public static readonly instance = new F32GreaterInstruction();
}
export class F32LesserEqualInstruction extends AbstractNumericInstruction<OpCodes.f32_le> {
    private constructor() { super(OpCodes.f32_le); }
    public static readonly instance = new F32LesserEqualInstruction();
}
export class F32GreaterEqualInstruction extends AbstractNumericInstruction<OpCodes.f32_ge> {
    private constructor() { super(OpCodes.f32_ge); }
    public static readonly instance = new F32GreaterEqualInstruction();
}
export class F32AbsoluteInstruction extends AbstractNumericInstruction<OpCodes.f32_abs> {
    private constructor() { super(OpCodes.f32_abs); }
    public static readonly instance = new F32AbsoluteInstruction();
}
export class F32NegativeInstruction extends AbstractNumericInstruction<OpCodes.f32_neg> {
    private constructor() { super(OpCodes.f32_neg); }
    public static readonly instance = new F32NegativeInstruction();
}
export class F32CeilInstruction extends AbstractNumericInstruction<OpCodes.f32_ceil> {
    private constructor() { super(OpCodes.f32_ceil); }
    public static readonly instance = new F32CeilInstruction();
}
export class F32FloorInstruction extends AbstractNumericInstruction<OpCodes.f32_floor> {
    private constructor() { super(OpCodes.f32_floor); }
    public static readonly instance = new F32FloorInstruction();
}
export class F32TruncateInstruction extends AbstractNumericInstruction<OpCodes.f32_trunc> {
    private constructor() { super(OpCodes.f32_trunc); }
    public static readonly instance = new F32TruncateInstruction();
}
export class F32NearestInstruction extends AbstractNumericInstruction<OpCodes.f32_nearest> {
    private constructor() { super(OpCodes.f32_nearest); }
    public static readonly instance = new F32NearestInstruction();
}
export class F32SquareRootInstruction extends AbstractNumericInstruction<OpCodes.f32_sqrt> {
    private constructor() { super(OpCodes.f32_sqrt); }
    public static readonly instance = new F32SquareRootInstruction();
}
export class F32AddInstruction extends AbstractNumericInstruction<OpCodes.f32_add> {
    private constructor() { super(OpCodes.f32_add); }
    public static readonly instance = new F32AddInstruction();
}
export class F32SubtractInstruction extends AbstractNumericInstruction<OpCodes.f32_sub> {
    private constructor() { super(OpCodes.f32_sub); }
    public static readonly instance = new F32SubtractInstruction();
}
export class F32MultiplyInstruction extends AbstractNumericInstruction<OpCodes.f32_mul> {
    private constructor() { super(OpCodes.f32_mul); }
    public static readonly instance = new F32MultiplyInstruction();
}
export class F32DivideInstruction extends AbstractNumericInstruction<OpCodes.f32_div> {
    private constructor() { super(OpCodes.f32_div); }
    public static readonly instance = new F32DivideInstruction();
}
export class F32MinInstruction extends AbstractNumericInstruction<OpCodes.f32_min> {
    private constructor() { super(OpCodes.f32_min); }
    public static readonly instance = new F32MinInstruction();
}
export class F32MaxInstruction extends AbstractNumericInstruction<OpCodes.f32_max> {
    private constructor() { super(OpCodes.f32_max); }
    public static readonly instance = new F32MaxInstruction();
}
export class F32CopySignInstruction extends AbstractNumericInstruction<OpCodes.f32_copysign> {
    private constructor() { super(OpCodes.f32_copysign); }
    public static readonly instance = new F32CopySignInstruction();
}
export class F32ConvertI32SignedInstruction extends AbstractNumericInstruction<OpCodes.f32_convert_i32_s> {
    private constructor() { super(OpCodes.f32_convert_i32_s); }
    public static readonly instance = new F32ConvertI32SignedInstruction();
}
export class F32ConvertI32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.f32_convert_i32_u> {
    private constructor() { super(OpCodes.f32_convert_i32_u); }
    public static readonly instance = new F32ConvertI32UnsignedInstruction();
}
export class F32ConvertI64SignedInstruction extends AbstractNumericInstruction<OpCodes.f32_convert_i64_s> {
    private constructor() { super(OpCodes.f32_convert_i64_s); }
    public static readonly instance = new F32ConvertI64SignedInstruction();
}
export class F32ConvertI64UnsignedInstruction extends AbstractNumericInstruction<OpCodes.f32_convert_i64_u> {
    private constructor() { super(OpCodes.f32_convert_i64_u); }
    public static readonly instance = new F32ConvertI64UnsignedInstruction();
}
export class F32DemoteF64Instruction extends AbstractNumericInstruction<OpCodes.f32_demote_f64> {
    private constructor() { super(OpCodes.f32_demote_f64); }
    public static readonly instance = new F32DemoteF64Instruction();
}
export class F32ReinterpretI32Instruction extends AbstractNumericInstruction<OpCodes.f32_reinterpret_i32> {
    private constructor() { super(OpCodes.f32_reinterpret_i32); }
    public static readonly instance = new F32ReinterpretI32Instruction();
}

export class F64EqualInstruction extends AbstractNumericInstruction<OpCodes.f64_eq> {
    private constructor() { super(OpCodes.f64_eq); }
    public static readonly instance = new F64EqualInstruction();
}
export class F64NotEqualInstruction extends AbstractNumericInstruction<OpCodes.f64_ne> {
    private constructor() { super(OpCodes.f64_ne); }
    public static readonly instance = new F64NotEqualInstruction();
}
export class F64LesserInstruction extends AbstractNumericInstruction<OpCodes.f64_lt> {
    private constructor() { super(OpCodes.f64_lt); }
    public static readonly instance = new F64LesserInstruction();
}
export class F64GreaterInstruction extends AbstractNumericInstruction<OpCodes.f64_gt> {
    private constructor() { super(OpCodes.f64_gt); }
    public static readonly instance = new F64GreaterInstruction();
}
export class F64LesserEqualInstruction extends AbstractNumericInstruction<OpCodes.f64_le> {
    private constructor() { super(OpCodes.f64_le); }
    public static readonly instance = new F64LesserEqualInstruction();
}
export class F64GreaterEqualInstruction extends AbstractNumericInstruction<OpCodes.f64_ge> {
    private constructor() { super(OpCodes.f64_ge); }
    public static readonly instance = new F64GreaterEqualInstruction();
}
export class F64AbsoluteInstruction extends AbstractNumericInstruction<OpCodes.f64_abs> {
    private constructor() { super(OpCodes.f64_abs); }
    public static readonly instance = new F64AbsoluteInstruction();
}
export class F64NegativeInstruction extends AbstractNumericInstruction<OpCodes.f64_neg> {
    private constructor() { super(OpCodes.f64_neg); }
    public static readonly instance = new F64NegativeInstruction();
}
export class F64CeilInstruction extends AbstractNumericInstruction<OpCodes.f64_ceil> {
    private constructor() { super(OpCodes.f64_ceil); }
    public static readonly instance = new F64CeilInstruction();
}
export class F64FloorInstruction extends AbstractNumericInstruction<OpCodes.f64_floor> {
    private constructor() { super(OpCodes.f64_floor); }
    public static readonly instance = new F64FloorInstruction();
}
export class F64TruncateInstruction extends AbstractNumericInstruction<OpCodes.f64_trunc> {
    private constructor() { super(OpCodes.f64_trunc); }
    public static readonly instance = new F64TruncateInstruction();
}
export class F64NearestInstruction extends AbstractNumericInstruction<OpCodes.f64_nearest> {
    private constructor() { super(OpCodes.f64_nearest); }
    public static readonly instance = new F64NearestInstruction();
}
export class F64SquareRootInstruction extends AbstractNumericInstruction<OpCodes.f64_sqrt> {
    private constructor() { super(OpCodes.f64_sqrt); }
    public static readonly instance = new F64SquareRootInstruction();
}
export class F64AddInstruction extends AbstractNumericInstruction<OpCodes.f64_add> {
    private constructor() { super(OpCodes.f64_add); }
    public static readonly instance = new F64AddInstruction();
}
export class F64SubtractInstruction extends AbstractNumericInstruction<OpCodes.f64_sub> {
    private constructor() { super(OpCodes.f64_sub); }
    public static readonly instance = new F64SubtractInstruction();
}
export class F64MultiplyInstruction extends AbstractNumericInstruction<OpCodes.f64_mul> {
    private constructor() { super(OpCodes.f64_mul); }
    public static readonly instance = new F64MultiplyInstruction();
}
export class F64DivideInstruction extends AbstractNumericInstruction<OpCodes.f64_div> {
    private constructor() { super(OpCodes.f64_div); }
    public static readonly instance = new F64DivideInstruction();
}
export class F64MinInstruction extends AbstractNumericInstruction<OpCodes.f64_min> {
    private constructor() { super(OpCodes.f64_min); }
    public static readonly instance = new F64MinInstruction();
}
export class F64MaxInstruction extends AbstractNumericInstruction<OpCodes.f64_max> {
    private constructor() { super(OpCodes.f64_max); }
    public static readonly instance = new F64MaxInstruction();
}
export class F64CopySignInstruction extends AbstractNumericInstruction<OpCodes.f64_copysign> {
    private constructor() { super(OpCodes.f64_copysign); }
    public static readonly instance = new F64CopySignInstruction();
}
export class F64ConvertI32SignedInstruction extends AbstractNumericInstruction<OpCodes.f64_convert_i32_s> {
    private constructor() { super(OpCodes.f64_convert_i32_s); }
    public static readonly instance = new F64ConvertI32SignedInstruction();
}
export class F64ConvertI32UnsignedInstruction extends AbstractNumericInstruction<OpCodes.f64_convert_i32_u> {
    private constructor() { super(OpCodes.f64_convert_i32_u); }
    public static readonly instance = new F64ConvertI32UnsignedInstruction();
}
export class F64ConvertI64SignedInstruction extends AbstractNumericInstruction<OpCodes.f64_convert_i64_s> {
    private constructor() { super(OpCodes.f64_convert_i64_s); }
    public static readonly instance = new F64ConvertI64SignedInstruction();
}
export class F64ConvertI64UnsignedInstruction extends AbstractNumericInstruction<OpCodes.f64_convert_i64_u> {
    private constructor() { super(OpCodes.f64_convert_i64_u); }
    public static readonly instance = new F64ConvertI64UnsignedInstruction();
}
export class F64PromoteF32Instruction extends AbstractNumericInstruction<OpCodes.f64_promote_f32> {
    private constructor() { super(OpCodes.f64_promote_f32); }
    public static readonly instance = new F64PromoteF32Instruction();
}
export class F64ReinterpretI64Instruction extends AbstractNumericInstruction<OpCodes.f64_reinterpret_i64> {
    private constructor() { super(OpCodes.f64_reinterpret_i64); }
    public static readonly instance = new F64ReinterpretI64Instruction();
}

export type NumericTruncationInstructionCodes =
    ForwardOpCodes.i32_trunc_sat_f32_s | ForwardOpCodes.i32_trunc_sat_f32_u |
    ForwardOpCodes.i32_trunc_sat_f64_s | ForwardOpCodes.i32_trunc_sat_f64_u |
    ForwardOpCodes.i64_trunc_sat_f32_s | ForwardOpCodes.i64_trunc_sat_f32_u; 
export abstract class NumericTruncationInstruction<O extends NumericTruncationInstructionCodes> extends AbstractNumericInstruction<OpCodes.look_forward> {
    public readonly OperationCode!: O;
    protected constructor(code: O) { super(OpCodes.look_forward); protect(this, 'OperationCode', code, true); }
    public override encode(encoder: IEncoder, context: ExpressionModule): void {
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode)
    }
}

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
            TruncateF32: I32TruncateF32SignedInstruction.instance,
            TruncateF64: I32TruncateF64SignedInstruction.instance
        },
        Unsigned: {
            Lesser: I32LesserUnsignedInstruction.instance,
            Greater: I32GreaterUnsignedInstruction.instance,
            LesserEqual: I32LesserEqualUnsignedInstruction.instance,
            GreaterEqual: I32GreaterEqualUnsignedInstruction.instance,
            Divide: I32DivideUnsignedInstruction.instance,
            Remainder: I32RemainderUnsignedInstruction.instance,
            BitShiftRight: I32BitShifRightUnsignedInstruction.instance,
            TruncateF32: I32TruncateF32UnsignedInstruction.instance,
            TruncateF64: I32TruncateF64UnsignedInstruction.instance
        },
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
        },
        Unsigned: {
            Lesser: I64LesserUnsignedInstruction.instance,
            Greater: I64GreaterUnsignedInstruction.instance,
            LesserEqual: I64LesserEqualUnsignedInstruction.instance,
            GreaterEqual: I64GreaterEqualUnsignedInstruction.instance,
            Divide: I64DivideUnsignedInstruction.instance,
            Remainder: I64RemainderUnsignedInstruction.instance,
            BitShiftRight: I64BitShifRightUnsignedInstruction.instance,
            TruncateF32: I64TruncateF32UnsignedInstruction.instance,
            TruncateF64: I64TruncateF64UnsignedInstruction.instance,
            ExtendI32: I64ExtendI32UnsignedInstruction.instance,
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