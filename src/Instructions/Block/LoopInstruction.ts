import { OpCodes } from '../../OpCodes';
import { AbstractBlockInstruction, BlockType } from './AbstractBlockInstruction';
import type { Instruction } from '../Instruction';

export class LoopInstruction extends AbstractBlockInstruction<OpCodes.loop> {
    public constructor(block?: BlockType, instructions: Instruction[]=[]) { super(OpCodes.loop, block, instructions); }
}
LoopInstruction.registerInstruction(OpCodes.loop);