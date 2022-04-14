import { OpCodes } from '../../OpCodes';
import { LocalVariableInstruction } from './LocalVariableInstruction';

export class LocalTeeInstruction extends LocalVariableInstruction<OpCodes.local_tee> {
    public constructor(index: number) { super(OpCodes.local_tee, index); }
}
LocalTeeInstruction.registerInstruction(OpCodes.local_tee);