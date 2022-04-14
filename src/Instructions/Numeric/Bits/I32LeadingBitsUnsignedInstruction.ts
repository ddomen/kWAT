import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32LeadingBitsUnsigendInstruction extends AbstractNumericInstruction<OpCodes.i32_clz> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_clz); }
    public static readonly instance = new I32LeadingBitsUnsigendInstruction();
}
I32LeadingBitsUnsigendInstruction.registerInstruction(OpCodes.i32_clz);