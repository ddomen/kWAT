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
import { MemoryLoadInstruction } from './MemoryLoadInstruction';
import type { StackEdit } from '../../Instruction';

export class F64LoadInstruction extends MemoryLoadInstruction<OpCodes.f64_load> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.f64 ] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.f64_load, memory); }
    public static readonly instance = new F64LoadInstruction();
}
F64LoadInstruction.registerInstruction(OpCodes.f64_load);