import { MemoryType, Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryStoreInstruction } from './MemoryStoreInstruction';
import type { StackEdit } from '../../Instruction';

export class I32Store16Instruction extends MemoryStoreInstruction<OpCodes.i32_store16> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.i32_store16, memory); }
    public static readonly instance = new I32Store16Instruction();
}
I32Store16Instruction.registerInstruction(OpCodes.i32_store16);