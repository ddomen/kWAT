import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32BitRotationLeftInstruction extends AbstractNumericInstruction<OpCodes.i32_rotl> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_rotl); }
    public static readonly instance = new I32BitRotationLeftInstruction();
}
I32BitRotationLeftInstruction.registerInstruction(OpCodes.i32_rotl);