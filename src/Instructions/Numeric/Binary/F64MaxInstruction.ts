import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64MaxInstruction extends AbstractNumericInstruction<OpCodes.f64_max> {
    public override get stack(): StackEdit { return [ [ Type.f64, Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_max); }
    public static readonly instance = new F64MaxInstruction();
}
F64MaxInstruction.registerInstruction(OpCodes.f64_max);