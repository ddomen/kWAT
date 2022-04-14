import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryStoreInstruction } from './MemoryStoreInstruction';
import type { StackEdit } from '../../Instruction';

export class I64Store16Instruction extends MemoryStoreInstruction<OpCodes.i64_store16> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i64 ], [] ]; }
    private constructor() { super(OpCodes.i64_store16); }
    public static readonly instance = new I64Store16Instruction();
}
I64Store16Instruction.registerInstruction(OpCodes.i64_store16);