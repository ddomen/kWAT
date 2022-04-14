import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32GreaterUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_gt_u> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_gt_u); }
    public static readonly instance = new I32GreaterUnsignedInstruction();
}
I32GreaterUnsignedInstruction.registerInstruction(OpCodes.i32_gt_u);