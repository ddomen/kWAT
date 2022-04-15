import { Type } from '../../Types';
import { OpCodes } from '../../OpCodes';
import { AbstractMemoryInstruction } from './AbstractMemoryInstruction';
import type { ExpressionEncodeContext, StackEdit } from '../Instruction';
import type { IEncoder } from '../../Encoding';

export class MemorySizeInstruction extends AbstractMemoryInstruction<OpCodes.memory_size> {
    public override get stack(): StackEdit { return [ [], [ Type.i32 ] ]; }
    private constructor() { super(OpCodes.memory_size); }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.uint8(0x00);
    }
    public static readonly instance = new MemorySizeInstruction();
}
MemorySizeInstruction.registerInstruction(OpCodes.memory_size);