import { ControlInstruction } from '../Control/ControlInstruction';
import type { OpCodes } from '../../OpCodes';

export type CallInstructionCodes = OpCodes.call | OpCodes.call_indirect |
                                    OpCodes.return_call | OpCodes.return_call_indirect;
export abstract class AbstractCallInstruction<O extends CallInstructionCodes=CallInstructionCodes> extends ControlInstruction<O> { }