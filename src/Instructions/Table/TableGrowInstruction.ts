import { TableType, Type } from "../../Types";
import { OpCodes, OpCodesExt1 } from "../../OpCodes";
import { TableOperationInstruction } from "./TableOperationInstruction";
import type { StackEdit } from "../Instruction";

export class TableGrowInstruction extends TableOperationInstruction<OpCodesExt1.table_grow> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ]; }
    public constructor(table: TableType) { super(OpCodesExt1.table_grow, table); }
}
TableGrowInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.table_grow);