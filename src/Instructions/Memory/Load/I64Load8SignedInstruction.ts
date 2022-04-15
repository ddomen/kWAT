import { MemoryType, Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryLoadInstruction } from './MemoryLoadInstruction';
import type { StackEdit } from '../../Instruction';

export class I64Load8SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load8_s> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i64 ] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.i64_load8_s, memory); }
    public static readonly instance = new I64Load8SignedLoadInstruction();
}
I64Load8SignedLoadInstruction.registerInstruction(OpCodes.i64_load8_s);