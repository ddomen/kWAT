import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64TrailingBitsUnsigendInstruction extends AbstractNumericInstruction<OpCodes.i64_ctz> {
    public override get stack(): StackEdit { return [ [ Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_ctz); }
    public static readonly instance = new I64TrailingBitsUnsigendInstruction();
}
I64TrailingBitsUnsigendInstruction.registerInstruction(OpCodes.i64_ctz);