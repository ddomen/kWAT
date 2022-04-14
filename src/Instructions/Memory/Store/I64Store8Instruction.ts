import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryStoreInstruction } from './MemoryStoreInstruction';
import type { StackEdit } from '../../Instruction';

export class I64Store8Instruction extends MemoryStoreInstruction<OpCodes.i64_store8> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i64 ], [] ]; }
    private constructor() { super(OpCodes.i64_store8); }
    public static readonly instance = new I64Store8Instruction();
}
I64Store8Instruction.registerInstruction(OpCodes.i64_store8);