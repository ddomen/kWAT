import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32GreaterEqualUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_ge_u> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_ge_u); }
    public static readonly instance = new I32GreaterEqualUnsignedInstruction();
}
I32GreaterEqualUnsignedInstruction.registerInstruction(OpCodes.i32_ge_u);