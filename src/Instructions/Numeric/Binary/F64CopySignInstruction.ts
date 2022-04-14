import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64CopySignInstruction extends AbstractNumericInstruction<OpCodes.f64_copysign> {
    public override get stack(): StackEdit { return [ [ Type.f64, Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_copysign); }
    public static readonly instance = new F64CopySignInstruction();
}
F64CopySignInstruction.registerInstruction(OpCodes.f64_copysign);