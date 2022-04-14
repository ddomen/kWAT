import { OpCodes } from '../../OpCodes';
import { ControlInstruction } from '../Control/ControlInstruction';
import type { StackEdit } from '../Instruction';

export class ReturnInstruction extends ControlInstruction<OpCodes.return> {
    public override get stack(): StackEdit { return [ [ null ], [ { ref: 0 } ] ]; }
    private constructor() { super(OpCodes.return); }
    public static readonly instance = new ReturnInstruction();
}
ReturnInstruction.registerInstruction(OpCodes.return);