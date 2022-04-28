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
import { TableOperationInstruction } from './TableOperationInstruction';
import type { StackEdit } from '../Instruction';

export class TableSizeInstruction extends TableOperationInstruction<OpCodesExt1.table_size> {
    public override get stack(): StackEdit { return [ [], [ Type.i32 ] ]; }
    public constructor(table: TableType) { super(OpCodesExt1.table_size, table); }
}
TableSizeInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.table_size);