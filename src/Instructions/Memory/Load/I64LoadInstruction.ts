import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryLoadInstruction } from './MemoryLoadInstruction';
import type { StackEdit } from '../../Instruction';

export class I64LoadInstruction extends MemoryLoadInstruction<OpCodes.i64_load> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i64 ] ]; }
    private constructor() { super(OpCodes.i64_load); }
    public static readonly instance = new I64LoadInstruction();
}
I64LoadInstruction.registerInstruction(OpCodes.i64_load);