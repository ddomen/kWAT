import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32SubtractInstruction extends AbstractNumericInstruction<OpCodes.i32_sub> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_sub); }
    public static readonly instance = new I32SubtractInstruction();
}
I32SubtractInstruction.registerInstruction(OpCodes.i32_sub);