import { Type } from '../../Types';
import { OpCodes } from '../../OpCodes';
import { MemoryManagementInstruction } from './MemoryManagementInstruction';
import type { StackEdit } from '../Instruction';

export class MemoryGrowInstruction extends MemoryManagementInstruction<OpCodes.memory_grow> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ]; }
    private constructor() { super(OpCodes.memory_grow); }
    public static readonly instance = new MemoryGrowInstruction();
}
MemoryGrowInstruction.registerInstruction(OpCodes.memory_grow);