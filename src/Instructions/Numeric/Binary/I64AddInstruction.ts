import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64AddInstruction extends AbstractNumericInstruction<OpCodes.i64_add> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_add); }
    public static readonly instance = new I64AddInstruction();
}
I64AddInstruction.registerInstruction(OpCodes.i64_add);