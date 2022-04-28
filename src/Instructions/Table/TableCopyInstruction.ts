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

import { TableType, Type } from '../../Types';
import { TableInstruction } from './TableInstruction';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionDecodeContext, ExpressionEncodeContext, StackEdit } from '../Instruction';

export class TableCopyInstruction extends TableInstruction<OpCodesExt1.table_copy> {
    public Destination: TableType;
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32, Type.i32 ], [] ]; }
    public get Source(): TableType { return this.Table; }
    public set Source(value: TableType) { this.Table = value; }
    public constructor(table: TableType, destination: TableType) {
        super(OpCodesExt1.table_copy, table);
        this.Destination = destination;
    }
    public getDestinationIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.TableSection.Tables.indexOf(this.Destination);
        if(!pass && index < 0) { throw new Error('Table Instruction invalid destination table reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        if (!context.options.bulkMemory) { throw new Error('Bulk memory instruction detected'); }
        let dst = this.getDestinationIndex(context),
            src = this.getTableIndex(context);
        super.encode(encoder, context);
        encoder.uint32(src).uint32(dst);
    }
    public static override decode(decoder: IDecoder, context: ExpressionDecodeContext): TableCopyInstruction {
        let src = decoder.uint32();
        if (!context.module.TableSection.Tables[src]) { throw new Error('Table Copy Instruction invalid source table reference'); }
        let dest = decoder.uint32();
        if (!context.module.TableSection.Tables[dest]) { throw new Error('Table Copy Instruction invalid destination table reference'); }
        return new TableCopyInstruction(
            context.module.TableSection.Tables[src]!,
            context.module.TableSection.Tables[dest]!
        );
    }
}
TableCopyInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.table_copy);