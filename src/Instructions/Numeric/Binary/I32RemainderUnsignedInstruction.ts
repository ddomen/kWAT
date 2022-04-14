import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I32RemainderUnsignedInstruction extends AbstractNumericInstruction<OpCodes.i32_rem_u> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_rem_u); }
    public static readonly instance = new I32RemainderUnsignedInstruction();
}
I32RemainderUnsignedInstruction.registerInstruction(OpCodes.i32_rem_u);