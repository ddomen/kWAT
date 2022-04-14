import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64EqualZeroInstruction extends AbstractNumericInstruction<OpCodes.i64_eqz> {
    public override get stack(): StackEdit { return [ [ Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_eqz); }
    public static readonly instance = new I64EqualZeroInstruction();
}
I64EqualZeroInstruction.registerInstruction(OpCodes.i64_eqz);