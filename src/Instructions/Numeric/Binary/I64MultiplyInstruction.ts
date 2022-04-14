import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64MultiplyInstruction extends AbstractNumericInstruction<OpCodes.i64_mul> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_mul); }
    public static readonly instance = new I64MultiplyInstruction();
}
I64MultiplyInstruction.registerInstruction(OpCodes.i64_mul);