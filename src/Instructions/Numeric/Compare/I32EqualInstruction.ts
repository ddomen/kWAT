import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32EqualInstruction extends AbstractNumericInstruction<OpCodes.i32_eq> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_eq); }
    public static readonly instance = new I32EqualInstruction();
}
I32EqualInstruction.registerInstruction(OpCodes.i32_eq);