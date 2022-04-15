import { OpCodes } from '../../OpCodes';
import { protect } from '../../internal';
import { AbstractBranchInstruction } from './AbstractBranchInstruction';
import * as Types from '../../Types';
import type { AbstractBlockInstruction } from '../Block';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionEncodeContext, StackEdit } from '../Instruction';

export class BranchTableInstruction extends AbstractBranchInstruction<OpCodes.br_table> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [] ]; }
    public readonly Targets!: AbstractBlockInstruction[];
    constructor(firstTarget: AbstractBlockInstruction, ...targets: AbstractBlockInstruction[]) {
        super(OpCodes.br_table, firstTarget);
        protect(this, 'Targets', targets.slice(), true);
    }
    public override encode(encoder: IEncoder, _?: ExpressionEncodeContext): void {
        let idxs = this.Targets.map(t => t.getLabel(this));
        let index = this.Target.getLabel(this);
        let targets = [ index, ...idxs ];
        encoder.uint8(this.Code)
            .vector(targets.slice(0, -1), 'uint32')
            .uint32(targets.slice(-1)[0]!);
    }
    public static override decode(decoder: IDecoder, context: ExpressionEncodeContext): BranchTableInstruction {
        let bti = AbstractBranchInstruction.decode.call(this, decoder, context) as BranchTableInstruction;
        let labels = decoder.vector('uint32')
        labels.push(decoder.uint32());
        if (labels.some(l => !context.blocks[l])) { throw new Error('Branch Table Instruction invalid target label'); }
        bti.Targets.length = 0;
        bti.Targets.push(...labels.map(l => context.blocks[l]!));
        return bti;
    }
}
BranchTableInstruction.registerInstruction(OpCodes.br_table);