import { Type } from '../../Types';
import { OpCodes } from '../../OpCodes';
import { AbstractMemoryInstruction } from './AbstractMemoryInstruction';
import type { ExpressionContext, StackEdit } from '../Instruction';
import type { IEncoder } from '../../Encoding';

export class MemoryGrowInstruction extends AbstractMemoryInstruction<OpCodes.memory_grow> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ]; }
    private constructor() { super(OpCodes.memory_grow); }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.uint8(0x00);
    }
    public static readonly instance = new MemoryGrowInstruction();
}
MemoryGrowInstruction.registerInstruction(OpCodes.memory_grow);