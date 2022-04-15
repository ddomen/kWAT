import { protect } from '../../internal';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { AbstractTableInstruction } from './AbstractTableInstruction';
import type { IEncoder } from '../../Encoding';
import type { TableType } from '../../Types';
import type { ExpressionEncodeContext } from '../Instruction';

export type TableInstructionForwardCodes = OpCodesExt1.table_copy | OpCodesExt1.table_fill | OpCodesExt1.table_grow |
                                            OpCodesExt1.table_init | OpCodesExt1.table_size | OpCodesExt1.elem_drop;
export abstract class TableInstruction<O extends TableInstructionForwardCodes=TableInstructionForwardCodes> extends AbstractTableInstruction<OpCodes.op_extension_1> {
    public readonly OperationCode!: O;
    public Table: TableType;
    protected constructor(code: O, table: TableType) {
        super(OpCodes.op_extension_1);
        protect(this, 'OperationCode', code, true);
        this.Table = table;
    }
    public getTableIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.TableSection.Tables.indexOf(this.Table);
        if(!pass && index < 0) { throw new Error('Table Instruction invalid table reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode);
    }
}