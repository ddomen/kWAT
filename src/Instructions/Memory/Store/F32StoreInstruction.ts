import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryStoreInstruction } from './MemoryStoreInstruction';
import type { StackEdit } from '../../Instruction';

export class F32StoreInstruction extends MemoryStoreInstruction<OpCodes.f32_store> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.f32 ], [] ]; }
    private constructor() { super(OpCodes.f32_store); }
    public static readonly instance = new F32StoreInstruction();
}
F32StoreInstruction.registerInstruction(OpCodes.f32_store);