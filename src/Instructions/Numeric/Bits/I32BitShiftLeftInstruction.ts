import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32BitShifLeftInstruction extends AbstractNumericInstruction<OpCodes.i32_shl> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_shl); }
    public static readonly instance = new I32BitShifLeftInstruction();
}
I32BitShifLeftInstruction.registerInstruction(OpCodes.i32_shl);