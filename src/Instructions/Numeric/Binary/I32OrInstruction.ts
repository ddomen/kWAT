import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32OrInstruction extends AbstractNumericInstruction<OpCodes.i32_or> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_or); }
    public static readonly instance = new I32OrInstruction();
}
I32OrInstruction.registerInstruction(OpCodes.i32_or);