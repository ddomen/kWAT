import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32WrapI64Instruction extends AbstractNumericInstruction<OpCodes.i32_wrap_i64> {
    public override get stack(): StackEdit { return [ [ Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_wrap_i64); }
    public static readonly instance = new I32WrapI64Instruction();
}
I32WrapI64Instruction.registerInstruction(OpCodes.i32_wrap_i64);