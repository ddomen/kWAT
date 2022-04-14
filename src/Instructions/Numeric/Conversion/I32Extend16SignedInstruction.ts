import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32Extend16SignedInstruction extends AbstractNumericInstruction<OpCodes.i32_extend16_s> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_extend16_s); }
    public static readonly instance = new I32Extend16SignedInstruction();
}
I32Extend16SignedInstruction.registerInstruction(OpCodes.i32_extend16_s);