import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32SquareRootInstruction extends AbstractNumericInstruction<OpCodes.f32_sqrt> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_sqrt); }
    public static readonly instance = new F32SquareRootInstruction();
}
F32SquareRootInstruction.registerInstruction(OpCodes.f32_sqrt);