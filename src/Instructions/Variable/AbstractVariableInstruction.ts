import { Instruction } from '../Instruction';
import type { OpCodes } from '../../OpCodes';

export type VariableInstructionCodes = OpCodes.local_get | OpCodes.local_set | OpCodes.local_tee | OpCodes.global_get | OpCodes.global_set;
export abstract class AbstractVariableInstruction<O extends VariableInstructionCodes> extends Instruction<O> { }
