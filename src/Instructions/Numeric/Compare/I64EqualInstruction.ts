import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64EqualInstruction extends AbstractNumericInstruction<OpCodes.i64_eq> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_eq); }
    public static readonly instance = new I64EqualInstruction();
}
I64EqualInstruction.registerInstruction(OpCodes.i64_eq);