import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64NegativeInstruction extends AbstractNumericInstruction<OpCodes.f64_neg> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_neg); }
    public static readonly instance = new F64NegativeInstruction();
}
F64NegativeInstruction.registerInstruction(OpCodes.f64_neg);