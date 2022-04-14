import { Type } from '../../Types';
import { OpCodes } from '../../OpCodes';
import { AbstractTableInstruction } from './AbstractTableInstruction';
import type { StackEdit } from '../Instruction';

export class TableSetInstruction extends AbstractTableInstruction<OpCodes.table_set> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [] ]; }
    private constructor() { super(OpCodes.table_set); }
    public static readonly instance = new TableSetInstruction();
}
TableSetInstruction.registerInstruction(OpCodes.table_set);