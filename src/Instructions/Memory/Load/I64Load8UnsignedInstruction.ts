import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryLoadInstruction } from './MemoryLoadInstruction';
import type { StackEdit } from '../../Instruction';

export class I64Load8UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load8_u> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i64 ] ]; }
    private constructor() { super(OpCodes.i64_load8_u); }
    public static readonly instance = new I64Load8UnsignedLoadInstruction();
}
I64Load8UnsignedLoadInstruction.registerInstruction(OpCodes.i64_load8_u);