import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64TruncateInstruction extends AbstractNumericInstruction<OpCodes.f64_trunc> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_trunc); }
    public static readonly instance = new F64TruncateInstruction();
}
F64TruncateInstruction.registerInstruction(OpCodes.f64_trunc);