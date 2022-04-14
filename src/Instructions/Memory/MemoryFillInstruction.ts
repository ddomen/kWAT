import { Type } from '../../Types';
import { protect } from '../../internal';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { AbstractMemoryInstruction } from './AbstractMemoryInstruction';
import type { ExpressionContext, StackEdit } from '../Instruction';
import type { IEncoder } from '../../Encoding';

export class MemoryFillInstruction extends AbstractMemoryInstruction<OpCodes.op_extension_1> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32, Type.i32 ], [] ]; }
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