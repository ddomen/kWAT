import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64BitRotationLeftInstruction extends AbstractNumericInstruction<OpCodes.i64_rotl> {
    public override get stack(): StackEdit { return [ [ Type.i64, Type.i64 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i64_rotl); }
    public static readonly instance = new I64BitRotationLeftInstruction();
}
I64BitRotationLeftInstruction.registerInstruction(OpCodes.i64_rotl);