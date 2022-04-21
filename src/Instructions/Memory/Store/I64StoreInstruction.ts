/*
 * Copyright (C) 2022 Daniele Domenichelli
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

import { MemoryType, Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { MemoryStoreInstruction } from './MemoryStoreInstruction';
import type { StackEdit } from '../../Instruction';

export class I64StoreInstruction extends MemoryStoreInstruction<OpCodes.i64_store> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i64 ], [] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.i64_store, memory); }
    public static readonly instance = new I64StoreInstruction();
}
I64StoreInstruction.registerInstruction(OpCodes.i64_store);