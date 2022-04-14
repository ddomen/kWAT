import { OpCodes } from '../../OpCodes';
import { ControlInstruction } from './ControlInstruction';

export class NopInstruction extends ControlInstruction<OpCodes.nop> {
    private constructor() { super(OpCodes.nop); }
    public static readonly instance = new NopInstruction();
}
NopInstruction.registerInstruction(OpCodes.nop);