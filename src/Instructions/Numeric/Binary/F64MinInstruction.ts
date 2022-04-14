import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64MinInstruction extends AbstractNumericInstruction<OpCodes.f64_min> {
    public override get stack(): StackEdit { return [ [ Type.f64, Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_min); }
    public static readonly instance = new F64MinInstruction();
}
F64MinInstruction.registerInstruction(OpCodes.f64_min);