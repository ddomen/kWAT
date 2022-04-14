import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32EqualZeroInstruction extends AbstractNumericInstruction<OpCodes.i32_eqz> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_eqz); }
    public static readonly instance = new I32EqualZeroInstruction();
}
I32EqualZeroInstruction.registerInstruction(OpCodes.i32_eqz);