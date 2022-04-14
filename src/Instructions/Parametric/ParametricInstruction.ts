import { Instruction } from '../Instruction';
import type { OpCodes } from '../../OpCodes';

export type ParametricInstructionCodes = OpCodes.drop | OpCodes.select | OpCodes.select_t;
export abstract class ParametricInstruction<O extends ParametricInstructionCodes=ParametricInstructionCodes> extends Instruction<O> { }