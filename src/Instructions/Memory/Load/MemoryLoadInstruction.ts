import { MemoryLoadInstructionCodes, MemoryManagementInstruction } from '../MemoryManagementInstruction';
import type { MemoryType } from '../../../Types';
import type { IEncoder } from '../../../Encoding';
import type { ExpressionEncodeContext } from '../../Instruction';

export abstract class MemoryLoadInstruction<O extends MemoryLoadInstructionCodes> extends MemoryManagementInstruction<O> {
    public Memory: MemoryType | null;
    public constructor(code: O, memory?: MemoryType) { super(code); this.Memory = memory || null; }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        let i = 0;
        if (this.Memory) {
            i = context.module.MemorySection.indexOf(this.Memory);
            if (i === -1) { i = context.module.ImportSection.indexOf(this.Memory)}
            if (i === -1) { throw new Error('Memory index not found: ' + this.Memory); }
        }
        encoder.uint32(i);
    }
}
