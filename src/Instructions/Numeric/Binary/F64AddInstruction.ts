import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64AddInstruction extends AbstractNumericInstruction<OpCodes.f64_add> {
    public override get stack(): StackEdit { return [ [ Type.f64, Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_add); }
    public static readonly instance = new F64AddInstruction();
}
F64AddInstruction.registerInstruction(OpCodes.f64_add);