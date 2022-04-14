import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64LesserEqualInstruction extends AbstractNumericInstruction<OpCodes.f64_le> {
    public override get stack(): StackEdit { return [ [ Type.f64, Type.f64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.f64_le); }
    public static readonly instance = new F64LesserEqualInstruction();
}
F64LesserEqualInstruction.registerInstruction(OpCodes.f64_le);