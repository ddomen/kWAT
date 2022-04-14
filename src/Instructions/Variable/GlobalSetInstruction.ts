import { OpCodes } from '../../OpCodes';
import { GlobalVariableInstruction } from './GlobalVariableInstruction';
import type { GlobalVariable } from '../../Sections';

export class GlobalSetInstruction extends GlobalVariableInstruction<OpCodes.global_set> {
    public constructor(variable: GlobalVariable) { super(OpCodes.global_set, variable); }
}
GlobalSetInstruction.registerInstruction(OpCodes.global_set);