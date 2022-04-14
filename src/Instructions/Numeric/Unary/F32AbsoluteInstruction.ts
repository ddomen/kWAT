import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F32AbsoluteInstruction extends AbstractNumericInstruction<OpCodes.f32_abs> {
    public override get stack(): StackEdit { return [ [ Type.f32 ], [ Type.f32 ] ] }
    private constructor() { super(OpCodes.f32_abs); }
    public static readonly instance = new F32AbsoluteInstruction();
}
F32AbsoluteInstruction.registerInstruction(OpCodes.f32_abs);