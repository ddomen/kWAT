import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64BitRotationRightInstruction extends AbstractNumericInstruction<OpCodes.i64_rotr> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_rotr); }
    public static readonly instance = new I64BitRotationRightInstruction();
}
I64BitRotationRightInstruction.registerInstruction(OpCodes.i64_rotr);