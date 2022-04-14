import { OpCodes } from '../../OpCodes';
import { AbstractBranchInstruction } from './AbstractBranchInstruction';
import type { AbstractBlockInstruction } from '../Block';

export class BranchInstruction extends AbstractBranchInstruction<OpCodes.br> {
    constructor(target: AbstractBlockInstruction) { super(OpCodes.br, target); }
}
BranchInstruction.registerInstruction(OpCodes.br);