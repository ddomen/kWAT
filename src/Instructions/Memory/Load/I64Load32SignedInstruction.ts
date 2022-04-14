import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryLoadInstruction } from './MemoryLoadInstruction';
import type { StackEdit } from '../../Instruction';

export class I64Load32SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load32_s> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i64 ] ]; }
    private constructor() { super(OpCodes.i64_load32_s); }
    public static readonly instance = new I64Load32SignedLoadInstruction();
}
I64Load32SignedLoadInstruction.registerInstruction(OpCodes.i64_load32_s);