import { OpCodes } from '../../OpCodes';
import { GlobalVariableInstruction } from './GlobalVariableInstruction';
import type { GlobalVariable } from '../../Sections';

export class GlobalGetInstruction extends GlobalVariableInstruction<OpCodes.global_get> {
    public constructor(variable: GlobalVariable) { super(OpCodes.global_get, variable); }
}
GlobalGetInstruction.registerInstruction(OpCodes.global_get);