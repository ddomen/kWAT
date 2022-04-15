import { MemoryType, Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryStoreInstruction } from './MemoryStoreInstruction';
import type { StackEdit } from '../../Instruction';

export class I64StoreInstruction extends MemoryStoreInstruction<OpCodes.i64_store> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i64 ], [] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.i64_store, memory); }
    public static readonly instance = new I64StoreInstruction();
}
I64StoreInstruction.registerInstruction(OpCodes.i64_store);