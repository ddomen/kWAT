import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryStoreInstruction } from './MemoryStoreInstruction';
import type { StackEdit } from '../../Instruction';

export class I32Store8Instruction extends MemoryStoreInstruction<OpCodes.i32_store8> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [] ]; }
    private constructor() { super(OpCodes.i32_store8); }
    public static readonly instance = new I32Store8Instruction();
}
I32Store8Instruction.registerInstruction(OpCodes.i32_store8);