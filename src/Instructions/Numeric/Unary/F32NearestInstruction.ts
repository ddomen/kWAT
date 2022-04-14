import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32NearestInstruction extends AbstractNumericInstruction<OpCodes.f32_nearest> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_nearest); }
    public static readonly instance = new F32NearestInstruction();
}
F32NearestInstruction.registerInstruction(OpCodes.f32_nearest);