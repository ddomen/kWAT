import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryLoadInstruction } from './MemoryLoadInstruction';
import type { StackEdit } from '../../Instruction';

export class F64LoadInstruction extends MemoryLoadInstruction<OpCodes.f64_load> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.f64 ] ]; }
    private constructor() { super(OpCodes.f64_load); }
    public static readonly instance = new F64LoadInstruction();
}
F64LoadInstruction.registerInstruction(OpCodes.f64_load);