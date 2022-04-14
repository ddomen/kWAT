import { OpCodes } from '../../OpCodes';
import { LocalVariableInstruction } from './LocalVariableInstruction';

export class LocalSetInstruction extends LocalVariableInstruction<OpCodes.local_set> {
    public constructor(index: number) { super(OpCodes.local_set, index); }
}
LocalSetInstruction.registerInstruction(OpCodes.local_set);