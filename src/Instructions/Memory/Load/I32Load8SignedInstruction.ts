import { MemoryType, Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryLoadInstruction } from './MemoryLoadInstruction';
import type { StackEdit } from '../../Instruction';

export class I32Load8SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load8_s> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.i32_load8_s, memory); }
    public static readonly instance = new I32Load8SignedLoadInstruction();
}
I32Load8SignedLoadInstruction.registerInstruction(OpCodes.i32_load8_s);