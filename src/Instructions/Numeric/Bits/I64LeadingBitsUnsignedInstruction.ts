import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64LeadingBitsUnsigendInstruction extends AbstractNumericInstruction<OpCodes.i64_clz> {
    public override get stack(): StackEdit { return [ [ Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_clz); }
    public static readonly instance = new I64LeadingBitsUnsigendInstruction();
}
I64LeadingBitsUnsigendInstruction.registerInstruction(OpCodes.i64_clz);