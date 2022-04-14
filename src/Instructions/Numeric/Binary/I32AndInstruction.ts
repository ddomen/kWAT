import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32AndInstruction extends AbstractNumericInstruction<OpCodes.i32_and> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_and); }
    public static readonly instance = new I32AndInstruction();
}
I32AndInstruction.registerInstruction(OpCodes.i32_and);