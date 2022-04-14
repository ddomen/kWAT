import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64SubtractInstruction extends AbstractNumericInstruction<OpCodes.f64_sub> {
    public override get stack(): StackEdit { return [ [ Type.f64, Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_sub); }
    public static readonly instance = new F64SubtractInstruction();
}
F64SubtractInstruction.registerInstruction(OpCodes.f64_sub);