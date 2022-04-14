import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32NotEqualInstruction extends AbstractNumericInstruction<OpCodes.i32_ne> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_ne); }
    public static readonly instance = new I32NotEqualInstruction();
}
I32NotEqualInstruction.registerInstruction(OpCodes.i32_ne);