import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryLoadInstruction } from './MemoryLoadInstruction';
import type { StackEdit } from '../../Instruction';

export class I32Load8UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load8_u> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ]; }
    private constructor() { super(OpCodes.i32_load8_u); }
    public static readonly instance = new I32Load8UnsignedLoadInstruction();
}
I32Load8UnsignedLoadInstruction.registerInstruction(OpCodes.i32_load8_u);