import { OpCodes } from '../../OpCodes';
import { Type } from '../../Types';
import { AbstractTableInstruction } from './AbstractTableInstruction';
import type { StackEdit } from '../Instruction';

export class TableGetInstruction extends AbstractTableInstruction<OpCodes.table_get> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [] ]; }
    private constructor() { super(OpCodes.table_get); }
    public static readonly instance = new TableGetInstruction();
}
TableGetInstruction.registerInstruction(OpCodes.table_get);