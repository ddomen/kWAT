import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64AbsoluteInstruction extends AbstractNumericInstruction<OpCodes.f64_abs> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_abs); }
    public static readonly instance = new F64AbsoluteInstruction();
}
F64AbsoluteInstruction.registerInstruction(OpCodes.f64_abs);