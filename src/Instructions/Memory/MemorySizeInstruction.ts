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

import { OpCodes } from '../../OpCodes';
import { MemoryType, Type } from '../../Types';
import { MemoryManagementInstruction } from './MemoryManagementInstruction';
import type { ExpressionEncodeContext, StackEdit } from '../Instruction';
import type { IEncoder } from '../../Encoding';

export class MemorySizeInstruction extends MemoryManagementInstruction<OpCodes.memory_size> {
    public override get stack(): StackEdit { return [ [], [ Type.i32 ] ]; }
    public constructor(memory?: MemoryType) { super(OpCodes.memory_size, memory); }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.uint8(0x00);
    }
    public static readonly instance = new MemorySizeInstruction();
}
MemorySizeInstruction.registerInstruction(OpCodes.memory_size);