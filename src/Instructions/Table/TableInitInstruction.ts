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
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { TableInstruction } from './TableInstruction';
import { KWatError, UnsupportedExtensionError } from '../../errors';
import type { ElementSegment } from '../../Sections';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionDecodeContext, ExpressionEncodeContext, StackEdit } from '../Instruction';

export class TableInitInstruction extends TableInstruction<OpCodesExt1.table_init> {
    public element: ElementSegment;
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32, Type.i32 ], [] ]; }
    public constructor(table: TableType, element: ElementSegment) { super(OpCodesExt1.table_init, table); this.element = element; }
    public getElementIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.elementSection.elements.indexOf(this.element);
        if(!pass && index < 0) { throw new KWatError('Table Init Instruction invalid element reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        if (!context.options.bulkMemory) { throw new UnsupportedExtensionError('bulk memory'); }
        let elem = this.getElementIndex(context),
            table = this.getTableIndex(context);
        super.encode(encoder, context);
        encoder.uint32(elem).uint32(table);
    }
    public static override decode(decoder: IDecoder, context: ExpressionDecodeContext): TableInitInstruction {
        let elem = decoder.uint32();
        if (!context.module.elementSection.elements[elem]) { throw new KWatError('Table Init Instruction invalid element reference'); }
        let table = decoder.uint32();
        if (!context.module.tableSection.tables[table]) { throw new KWatError('Table Init Instruction invalid table reference'); }
        return new TableInitInstruction(
            context.module.tableSection.tables[table]!,
            context.module.elementSection.elements[elem]!
        );
    }
}
TableInitInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.table_init);