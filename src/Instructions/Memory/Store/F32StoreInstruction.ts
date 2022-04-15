import { OpCodes } from '../../../OpCodes';
import { MemoryType, Type } from '../../../Types';
import { MemoryStoreInstruction } from './MemoryStoreInstruction';
import type { StackEdit } from '../../Instruction';

export class F32StoreInstruction extends MemoryStoreInstruction<OpCodes.f32_store> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.f32 ], [] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.f32_store, memory); }
    public static readonly instance = new F32StoreInstruction();
}
F32StoreInstruction.registerInstruction(OpCodes.f32_store);