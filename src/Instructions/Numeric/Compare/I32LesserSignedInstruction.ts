import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32LesserSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_lt_s> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_lt_s); }
    public static readonly instance = new I32LesserSignedInstruction();
}
I32LesserSignedInstruction.registerInstruction(OpCodes.i32_lt_s);