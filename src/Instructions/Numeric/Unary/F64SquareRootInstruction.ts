import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64SquareRootInstruction extends AbstractNumericInstruction<OpCodes.f64_sqrt> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_sqrt); }
    public static readonly instance = new F64SquareRootInstruction();
}
F64SquareRootInstruction.registerInstruction(OpCodes.f64_sqrt);