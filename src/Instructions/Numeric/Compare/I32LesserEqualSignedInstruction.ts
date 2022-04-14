import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32LesserEqualSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_le_s> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_le_s); }
    public static readonly instance = new I32LesserEqualSignedInstruction();
}
I32LesserEqualSignedInstruction.registerInstruction(OpCodes.i32_le_s);