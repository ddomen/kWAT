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

import { ExpressionEncodeContext, Instruction } from '../Instruction';
import type { OpCodes } from '../../OpCodes';
import type { MemoryType } from '../../Types';

export type MemoryInstructionCodes =
                OpCodes.i32_load | OpCodes.i64_load | OpCodes.f32_load | OpCodes.f64_load |
                OpCodes.i32_load8_s | OpCodes.i32_load8_u | OpCodes.i32_load16_s |
                OpCodes.i32_load16_u | OpCodes.i64_load8_s | OpCodes.i64_load8_u |
                OpCodes.i64_load16_s | OpCodes.i64_load16_u | OpCodes.i64_load32_s |
                OpCodes.i64_load32_u | OpCodes.i32_store | OpCodes.i64_store |
                OpCodes.f32_store | OpCodes.f64_store | OpCodes.i32_store8 |
                OpCodes.i32_store16 | OpCodes.i64_store8 | OpCodes.i64_store16 |
                OpCodes.i64_store32 | OpCodes.memory_size | OpCodes.memory_grow |
                OpCodes.op_extension_1;

export abstract class AbstractMemoryInstruction<O extends MemoryInstructionCodes> extends Instruction<O> {

    protected _memoryIndex(memory: MemoryType | null, context: ExpressionEncodeContext): number {
        let mem = 0;
        if (memory) {
            mem = context.module.MemorySection.indexOf(memory);
            if (mem === -1) { mem = context.module.ImportSection.indexOf(memory)}
            if (mem === -1) { throw new Error('Memory index not found: ' + memory); }
        }
        if (mem && !context.options.multipleMemory) { throw new Error('Multiple memory detected'); }
        return mem;
    }

}