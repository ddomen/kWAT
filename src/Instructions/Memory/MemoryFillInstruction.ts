import { MemoryType, Type } from '../../Types';
import { protect } from '../../internal';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { MemoryManagementInstruction } from './MemoryManagementInstruction';
import type { ExpressionEncodeContext, StackEdit } from '../Instruction';
import type { IEncoder } from '../../Encoding';

export class MemoryFillInstruction extends MemoryManagementInstruction<OpCodes.op_extension_1> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32, Type.i32 ], [] ]; }
    public readonly OperationCode!: OpCodesExt1.memory_fill;
    public constructor(memory?: MemoryType) {
        super(OpCodes.op_extension_1, memory);
        protect(this, 'OperationCode', OpCodesExt1.memory_fill, true);
    }
    protected override encodeAlign(_: IEncoder, __: ExpressionEncodeContext): void { }
    protected override encodeCode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encodeCode(encoder, context);
        encoder.uint32(this.OperationCode);
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        if (!context.options.bulkMemory) { throw new Error('Bulk memory instruction detected'); }
        super.encode(encoder, context);
    }
    public static readonly instance = new MemoryFillInstruction();
}
MemoryFillInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.memory_fill);