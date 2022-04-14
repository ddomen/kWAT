import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryLoadInstruction } from './MemoryLoadInstruction';
import type { StackEdit } from '../../Instruction';

export class I32Load16SignedLoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load16_s> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ]; }
    private constructor() { super(OpCodes.i32_load16_s); }
    public static readonly instance = new I32Load16SignedLoadInstruction();
}
I32Load16SignedLoadInstruction.registerInstruction(OpCodes.i32_load16_s);