import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32AddInstruction extends AbstractNumericInstruction<OpCodes.i32_add> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_add); }
    public static readonly instance = new I32AddInstruction();
}
I32AddInstruction.registerInstruction(OpCodes.i32_add);