import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64EqualInstruction extends AbstractNumericInstruction<OpCodes.f64_eq> {
    public override get stack(): StackEdit { return [ [ Type.f64, Type.f64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.f64_eq); }
    public static readonly instance = new F64EqualInstruction();
}
F64EqualInstruction.registerInstruction(OpCodes.f64_eq);