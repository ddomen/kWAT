import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryStoreInstruction } from './MemoryStoreInstruction';
import type { StackEdit } from '../../Instruction';

export class F64StoreInstruction extends MemoryStoreInstruction<OpCodes.f64_store> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.f64 ], [] ]; }
    private constructor() { super(OpCodes.f64_store); }
    public static readonly instance = new F64StoreInstruction();
}
F64StoreInstruction.registerInstruction(OpCodes.f64_store);