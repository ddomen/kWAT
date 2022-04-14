import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32BitRotationRightInstruction extends AbstractNumericInstruction<OpCodes.i32_rotr> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_rotr); }
    public static readonly instance = new I32BitRotationRightInstruction();
}
I32BitRotationRightInstruction.registerInstruction(OpCodes.i32_rotr);