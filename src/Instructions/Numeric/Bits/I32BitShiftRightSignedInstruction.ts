import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32BitShifRightSignedInstruction extends AbstractNumericInstruction<OpCodes.i32_shr_s> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_shr_s); }
    public static readonly instance = new I32BitShifRightSignedInstruction();
}
I32BitShifRightSignedInstruction.registerInstruction(OpCodes.i32_shr_s);