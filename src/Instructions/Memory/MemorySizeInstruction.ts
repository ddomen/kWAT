import { OpCodes } from '../../OpCodes';
import { MemoryType, Type } from '../../Types';
import { MemoryManagementInstruction } from './MemoryManagementInstruction';
import type { ExpressionEncodeContext, StackEdit } from '../Instruction';
import type { IEncoder } from '../../Encoding';

export class MemorySizeInstruction extends MemoryManagementInstruction<OpCodes.memory_size> {
    public override get stack(): StackEdit { return [ [], [ Type.i32 ] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.memory_size, memory); }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.uint8(0x00);
    }
    public static readonly instance = new MemorySizeInstruction();
}
MemorySizeInstruction.registerInstruction(OpCodes.memory_size);