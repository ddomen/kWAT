import { OpCodes } from '../../OpCodes';
import { ControlInstruction } from './ControlInstruction';

export class UnreachableInstruction extends ControlInstruction<OpCodes.unreachable> {
    private constructor() { super(OpCodes.unreachable); }
    public static readonly instance = new UnreachableInstruction();
}
UnreachableInstruction.registerInstruction(OpCodes.unreachable);