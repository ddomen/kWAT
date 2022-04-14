import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryLoadInstruction } from './MemoryLoadInstruction';
import type { StackEdit } from '../../Instruction';

export class I32Load16UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load16_u> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ]; }
    private constructor() { super(OpCodes.i32_load16_u); }
    public static readonly instance = new I32Load16UnsignedLoadInstruction();
}
I32Load16UnsignedLoadInstruction.registerInstruction(OpCodes.i32_load16_u);