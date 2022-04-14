import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32FloorInstruction extends AbstractNumericInstruction<OpCodes.f32_floor> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_floor); }
    public static readonly instance = new F32FloorInstruction();
}
F32FloorInstruction.registerInstruction(OpCodes.f32_floor);