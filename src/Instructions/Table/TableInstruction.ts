/**
  * @license kwat 0.1.0 Copyright (C) 2022 Daniele Domenichelli
  * 
  * This program is free software: you can redistribute it and/or modify
  * it under the terms of the GNU General Public License as published by
  * the Free Software Foundation, either version 3 of the License, or
  * (at your option) any later version.
  * 
  * This program is distributed in the hope that it will be useful,
  * but WITHOUT ANY WARRANTY; without even the implied warranty of
  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  * GNU General Public License for more details.
  * 
  * You should have received a copy of the GNU General Public License
  * along with this program.  If not, see <https://www.gnu.org/licenses/>.
  */

import { protect } from '../../internal';
import { KWatError } from '../../errors';
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
        let index = context.module.tableSection.tables.indexOf(this.Table);
        if(!pass && index < 0) { throw new KWatError('Table Instruction invalid table reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode);
    }
}