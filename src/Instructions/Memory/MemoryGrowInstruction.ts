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

import { MemoryType, Type } from '../../Types';
import { OpCodes } from '../../OpCodes';
import { MemoryManagementInstruction } from './MemoryManagementInstruction';
import type { StackEdit } from '../Instruction';

export class MemoryGrowInstruction extends MemoryManagementInstruction<OpCodes.memory_grow> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.memory_grow, memory); }
    public static readonly instance = new MemoryGrowInstruction();
}
MemoryGrowInstruction.registerInstruction(OpCodes.memory_grow);