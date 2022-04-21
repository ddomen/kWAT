import { AbstractMemoryInstruction } from './AbstractMemoryInstruction';
import type { OpCodes } from '../../OpCodes';
import type { MemoryType } from '../../Types';
import type { IEncoder } from '../../Encoding';
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
export type MemoryManagementInstructionCodes = MemoryLoadInstructionCodes | MemoryStoreInstructionCodes |
                OpCodes.op_extension_1 | OpCodes.memory_grow | OpCodes.memory_size;

export abstract class MemoryManagementInstruction<O extends MemoryManagementInstructionCodes>
    extends AbstractMemoryInstruction<O> {
    public Align: number;
    public Memory: MemoryType | null;
    protected constructor(code: O, memory?: MemoryType) {
        super(code);
        this.Align = 0;
        this.Memory = memory || null;
    }
    protected encodeCode(encoder: IEncoder, context: ExpressionEncodeContext): void { super.encode(encoder, context); }
    protected encodeAlign(encoder: IEncoder, _: ExpressionEncodeContext): void { encoder.uint32(this.Align); }
    protected encodeContent(_: IEncoder, __: ExpressionEncodeContext): void { }
    protected encodeMemory(encoder: IEncoder, context: ExpressionEncodeContext): void { encoder.uint32(this._memoryIndex(this.Memory, context)); }

    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        this.encodeCode(encoder, context);
        this.encodeAlign(encoder, context);
        this.encodeContent(encoder, context);
        this.encodeMemory(encoder, context);
    }
}