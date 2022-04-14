import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64DivideInstruction extends AbstractNumericInstruction<OpCodes.f64_div> {
    public override get stack(): StackEdit { return [ [ Type.f64, Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_div); }
    public static readonly instance = new F64DivideInstruction();
}
F64DivideInstruction.registerInstruction(OpCodes.f64_div);