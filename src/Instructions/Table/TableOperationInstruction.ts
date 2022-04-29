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

import { TableInstruction } from './TableInstruction';
import type { TableType } from '../../Types';
import type { OpCodesExt1 } from '../../OpCodes';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionDecodeContext, ExpressionEncodeContext, InstructionCtor } from '../Instruction';

export type TableOpInstructionCodes = OpCodesExt1.table_grow | OpCodesExt1.table_size | OpCodesExt1.table_fill;
export abstract class TableOperationInstruction<O extends TableOpInstructionCodes=TableOpInstructionCodes> extends TableInstruction<O> {
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        let index = this.getTableIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(
        this: InstructionCtor<TableOperationInstruction, [ TableType ]>,
        decoder: IDecoder,
        context: ExpressionDecodeContext
    ): TableOperationInstruction {
        let index = decoder.uint32();
        if (!context.module.TableSection.Tables[index]) { throw new Error('Table Operation Instruction invalid table reference'); }
        return new this(context.module.TableSection.Tables[index]!);
    }
}