import { AbstractMemoryInstruction } from './AbstractMemoryInstruction';
import type { IEncoder } from '../../Encoding';
import type { OpCodes } from '../../OpCodes';
import type { ExpressionEncodeContext } from '../Instruction';

export type MemoryLoadInstructionCodes =
                OpCodes.i32_load | OpCodes.i64_load | OpCodes.f32_load | OpCodes.f64_load |
                OpCodes.i32_load8_s | OpCodes.i32_load8_u | OpCodes.i32_load16_s |
                OpCodes.i32_load16_u | OpCodes.i64_load8_s | OpCodes.i64_load8_u |
                OpCodes.i64_load16_s | OpCodes.i64_load16_u | OpCodes.i64_load32_s | OpCodes.i64_load32_u;
export type MemoryStoreInstructionCodes =
                OpCodes.i32_store | OpCodes.i64_store | OpCodes.f32_store | OpCodes.f64_store |
                OpCodes.i32_store8 | OpCodes.i32_store16 | OpCodes.i64_store8 | OpCodes.i64_store16 |
                OpCodes.i64_store32;

export abstract class MemoryManagementInstruction<O extends MemoryLoadInstructionCodes | MemoryStoreInstructionCodes>
    extends AbstractMemoryInstruction<O> {
    public Align: number;
    public Offset: number;
    protected constructor(code: O) { super(code); this.Align = 0; this.Offset = 0; }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.uint32(this.Align).uint32(this.Offset);
    }
}