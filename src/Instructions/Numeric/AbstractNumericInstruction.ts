import { Instruction } from '../Instruction';
import type { OpCodes } from '../../OpCodes';

export abstract class AbstractNumericInstruction<O extends OpCodes> extends Instruction<O> { }