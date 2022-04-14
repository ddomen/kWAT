import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64CeilInstruction extends AbstractNumericInstruction<OpCodes.f64_ceil> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_ceil); }
    public static readonly instance = new F64CeilInstruction();
}
F64CeilInstruction.registerInstruction(OpCodes.f64_ceil);