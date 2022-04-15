import { Type } from '../../Types';
import { protect } from '../../internal';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { AbstractMemoryInstruction } from './AbstractMemoryInstruction';
import type { ExpressionEncodeContext, StackEdit } from '../Instruction';
import type { IEncoder } from '../../Encoding';

export class MemoryCopyInstruction extends AbstractMemoryInstruction<OpCodes.op_extension_1> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32, Type.i32 ], [] ]; }
    public readonly OperationCode!: OpCodesExt1.memory_copy;
    public constructor() {
        super(OpCodes.op_extension_1);
        protect(this, 'OperationCode', OpCodesExt1.memory_copy, true);
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        if (!context.options.bulkMemory) { throw new Error('Bulk memory instruction detected'); }
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode).uint8(0x00).uint8(0x00);
    }
    public static readonly instance = new MemoryCopyInstruction();
}
MemoryCopyInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.memory_copy);