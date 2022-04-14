import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32OnesCountInstruction extends AbstractNumericInstruction<OpCodes.i32_popcnt> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_popcnt); }
    public static readonly instance = new I32OnesCountInstruction();
}
I32OnesCountInstruction.registerInstruction(OpCodes.i32_popcnt);