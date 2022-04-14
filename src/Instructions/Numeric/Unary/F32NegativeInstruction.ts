import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32NegativeInstruction extends AbstractNumericInstruction<OpCodes.f32_neg> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_neg); }
    public static readonly instance = new F32NegativeInstruction();
}
F32NegativeInstruction.registerInstruction(OpCodes.f32_neg);