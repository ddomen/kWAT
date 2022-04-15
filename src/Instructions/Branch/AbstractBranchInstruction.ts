import { ExpressionEncodeContext, Instruction, InstructionCtor } from '../Instruction';
import type { OpCodes } from '../../OpCodes';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { AbstractBlockInstruction } from '../Block';

export type BranchInstructionCodes = OpCodes.br | OpCodes.br_if | OpCodes.br_table;
export abstract class AbstractBranchInstruction<O extends BranchInstructionCodes=BranchInstructionCodes> extends Instruction<O> {
    public Target: AbstractBlockInstruction;
    protected constructor(code: O, target: AbstractBlockInstruction) {
        super(code);
        this.Target = target;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        let index = this.Target.getLabel(this);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(
        this: InstructionCtor<AbstractBranchInstruction, [ AbstractBlockInstruction ]>,
        decoder: IDecoder,
        context: ExpressionEncodeContext
    ): AbstractBranchInstruction {
        super.decode(decoder, context);
        let label = decoder.uint32();
        if (!context.blocks[label]) { throw new Error('Encountered an invalid label'); }
        return new this(context.blocks[label]!);
    }
}