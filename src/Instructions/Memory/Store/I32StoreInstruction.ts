import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryStoreInstruction } from './MemoryStoreInstruction';
import type { StackEdit } from '../../Instruction';

export class I32StoreInstruction extends MemoryStoreInstruction<OpCodes.i32_store> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [] ]; }
    private constructor() { super(OpCodes.i32_store); }
    public static readonly instance = new I32StoreInstruction();
}
I32StoreInstruction.registerInstruction(OpCodes.i32_store);