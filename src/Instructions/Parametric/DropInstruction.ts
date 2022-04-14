import { OpCodes } from '../../OpCodes';
import { ParametricInstruction } from './ParametricInstruction';

export class DropInstruction extends ParametricInstruction<OpCodes.drop> {
    private constructor() { super(OpCodes.drop); }
    public static readonly instance = new DropInstruction();
}
DropInstruction.registerInstruction(OpCodes.drop);