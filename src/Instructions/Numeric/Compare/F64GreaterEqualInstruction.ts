import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64GreaterEqualInstruction extends AbstractNumericInstruction<OpCodes.f64_ge> {
    public override get stack(): StackEdit { return [ [ Type.f64, Type.f64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.f64_ge); }
    public static readonly instance = new F64GreaterEqualInstruction();
}
F64GreaterEqualInstruction.registerInstruction(OpCodes.f64_ge);