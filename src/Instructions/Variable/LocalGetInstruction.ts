import { OpCodes } from '../../OpCodes';
import { LocalVariableInstruction } from './LocalVariableInstruction';

export class LocalGetInstruction extends LocalVariableInstruction<OpCodes.local_get> {
    public constructor(index: number) { super(OpCodes.local_get, index); }
}
LocalGetInstruction.registerInstruction(OpCodes.local_get);