import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64NotEqualInstruction extends AbstractNumericInstruction<OpCodes.f64_ne> {
    public override get stack(): StackEdit { return [ [ Type.f64, Type.f64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.f64_ne); }
    public static readonly instance = new F64NotEqualInstruction();
}
F64NotEqualInstruction.registerInstruction(OpCodes.f64_ne);