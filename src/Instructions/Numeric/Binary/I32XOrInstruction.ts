import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32XOrInstruction extends AbstractNumericInstruction<OpCodes.i32_xor> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_xor); }
    public static readonly instance = new I32XOrInstruction();
}
I32XOrInstruction.registerInstruction(OpCodes.i32_xor);