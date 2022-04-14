import { OpCodes } from '../../OpCodes';
import { ReferenceInstruction } from './ReferenceInstruction';
import * as Types from '../../Types'
import type { StackEdit } from '../Instruction';

export class ReferenceIsNullInstruction extends ReferenceInstruction<OpCodes.ref_is_null> {
    public override get stack(): StackEdit { return [ [], [ Types.Type.i32 ] ]; }
    private constructor() { super(OpCodes.ref_is_null); }
    public static readonly instance = new ReferenceIsNullInstruction();
}
ReferenceIsNullInstruction.registerInstruction(OpCodes.ref_is_null);