import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64LesserInstruction extends AbstractNumericInstruction<OpCodes.f64_lt> {
    public override get stack(): StackEdit { return [ [ Type.f64, Type.f64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.f64_lt); }
    public static readonly instance = new F64LesserInstruction();
}
F64LesserInstruction.registerInstruction(OpCodes.f64_lt);