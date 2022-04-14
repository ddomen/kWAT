import { Instruction } from '../Instruction';
import type { OpCodes } from '../../OpCodes';

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

export abstract class AbstractMemoryInstruction<O extends MemoryInstructionCodes> extends Instruction<O> { }