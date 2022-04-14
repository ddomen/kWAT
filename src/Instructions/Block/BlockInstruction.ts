import { OpCodes } from '../../OpCodes';
import { AbstractBlockInstruction, BlockType } from './AbstractBlockInstruction';
import type { Instruction } from '../Instruction';

export class BlockInstruction extends AbstractBlockInstruction<OpCodes.block> {
    public constructor(block?: BlockType, instructions: Instruction[]=[]) { super(OpCodes.block, block, instructions); }
}
BlockInstruction.registerInstruction(OpCodes.block);