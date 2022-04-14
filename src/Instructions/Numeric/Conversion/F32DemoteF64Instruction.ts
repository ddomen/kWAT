import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32DemoteF64Instruction extends AbstractNumericInstruction<OpCodes.f32_demote_f64> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_demote_f64); }
    public static readonly instance = new F32DemoteF64Instruction();
}
F32DemoteF64Instruction.registerInstruction(OpCodes.f32_demote_f64);