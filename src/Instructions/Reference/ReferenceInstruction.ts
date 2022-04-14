import { Instruction } from '../Instruction';
import type { OpCodes } from '../../OpCodes';

export type ReferenceInstructionCodes = OpCodes.ref_null | OpCodes.ref_func | OpCodes.ref_is_null;
export abstract class ReferenceInstruction<O extends ReferenceInstructionCodes=ReferenceInstructionCodes> extends Instruction<O> { }