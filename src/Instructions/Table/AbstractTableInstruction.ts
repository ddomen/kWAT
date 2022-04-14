import { Instruction } from '../Instruction';
import type { OpCodes } from '../../OpCodes';

export type TableInstructionCodes = OpCodes.table_get | OpCodes.table_set | OpCodes.op_extension_1;
export abstract class AbstractTableInstruction<O extends TableInstructionCodes> extends Instruction<O> { }