import { MemoryType, Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryLoadInstruction } from './MemoryLoadInstruction';
import type { StackEdit } from '../../Instruction';

export class I64Load32UnsignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load32_u> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i64 ] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.i64_load32_u, memory); }
    public static readonly instance = new I64Load32UnsignedLoadInstruction();
}
I64Load32UnsignedLoadInstruction.registerInstruction(OpCodes.i64_load32_u);