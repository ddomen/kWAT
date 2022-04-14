import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32DivideInstruction extends AbstractNumericInstruction<OpCodes.f32_div> {
    public override get stack(): StackEdit { return [ [ Type.f32, Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_div); }
    public static readonly instance = new F32DivideInstruction();
}
F32DivideInstruction.registerInstruction(OpCodes.f32_div);