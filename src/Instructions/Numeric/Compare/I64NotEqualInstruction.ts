import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64NotEqualInstruction extends AbstractNumericInstruction<OpCodes.i64_ne> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_ne); }
    public static readonly instance = new I64NotEqualInstruction();
}
I64NotEqualInstruction.registerInstruction(OpCodes.i64_ne);