import { TableType, Type } from '../../Types';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { TableOperationInstruction } from './TableOperationInstruction';
import type { StackEdit } from '../Instruction';

export class TableSizeInstruction extends TableOperationInstruction<OpCodesExt1.table_size> {
    public override get stack(): StackEdit { return [ [], [ Type.i32 ] ]; }
    public constructor(table: TableType) { super(OpCodesExt1.table_size, table); }
}
TableSizeInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.table_size);