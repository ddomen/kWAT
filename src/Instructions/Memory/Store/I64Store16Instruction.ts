import { MemoryType, Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryStoreInstruction } from './MemoryStoreInstruction';
import type { StackEdit } from '../../Instruction';

export class I64Store16Instruction extends MemoryStoreInstruction<OpCodes.i64_store16> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i64 ], [] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.i64_store16, memory); }
    public static readonly instance = new I64Store16Instruction();
}
I64Store16Instruction.registerInstruction(OpCodes.i64_store16);