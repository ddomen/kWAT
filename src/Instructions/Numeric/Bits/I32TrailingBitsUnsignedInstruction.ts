import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32TrailingBitsUnsigendInstruction extends AbstractNumericInstruction<OpCodes.i32_ctz> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_ctz); }
    public static readonly instance = new I32TrailingBitsUnsigendInstruction();
}
I32TrailingBitsUnsigendInstruction.registerInstruction(OpCodes.i32_ctz);