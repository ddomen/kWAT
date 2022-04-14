import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64PromoteF32Instruction extends AbstractNumericInstruction<OpCodes.f64_promote_f32> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_promote_f32); }
    public static readonly instance = new F64PromoteF32Instruction();
}
F64PromoteF32Instruction.registerInstruction(OpCodes.f64_promote_f32);