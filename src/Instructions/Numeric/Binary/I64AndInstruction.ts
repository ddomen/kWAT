import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64AndInstruction extends AbstractNumericInstruction<OpCodes.i64_and> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_and); }
    public static readonly instance = new I64AndInstruction();
}
I64AndInstruction.registerInstruction(OpCodes.i64_and);