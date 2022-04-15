import { MemoryType, Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryLoadInstruction } from './MemoryLoadInstruction';
import type { StackEdit } from '../../Instruction';

export class I64Load16SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load16_s> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i64 ] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.i64_load16_s, memory); }
    public static readonly instance = new I64Load16SignedLoadInstruction();
}
I64Load16SignedLoadInstruction.registerInstruction(OpCodes.i64_load16_s);