import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64MultiplyInstruction extends AbstractNumericInstruction<OpCodes.f64_mul> {
    public override get stack(): StackEdit { return [ [ Type.f64, Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_mul); }
    public static readonly instance = new F64MultiplyInstruction();
}
F64MultiplyInstruction.registerInstruction(OpCodes.f64_mul);