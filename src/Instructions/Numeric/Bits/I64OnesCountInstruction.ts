import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64OnesCountInstruction extends AbstractNumericInstruction<OpCodes.i64_popcnt> {
    public override get stack(): StackEdit { return [ [ Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_popcnt); }
    public static readonly instance = new I64OnesCountInstruction();
}
I64OnesCountInstruction.registerInstruction(OpCodes.i64_popcnt);