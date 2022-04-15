import { OpCodes } from '../../../OpCodes';
import { MemoryType, Type } from '../../../Types';
import { MemoryLoadInstruction } from './MemoryLoadInstruction';
import type { StackEdit } from '../../Instruction';

export class F32LoadInstruction extends MemoryLoadInstruction<OpCodes.f32_load> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.f32 ] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.f32_load, memory); }
    public static readonly instance = new F32LoadInstruction();
}
F32LoadInstruction.registerInstruction(OpCodes.f32_load);