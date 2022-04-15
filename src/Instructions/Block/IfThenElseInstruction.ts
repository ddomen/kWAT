import { OpCodes } from '../../OpCodes';
import { protect } from '../../internal';
import { AbstractBlockInstruction, BlockType } from './AbstractBlockInstruction';
import * as Types from '../../Types';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionEncodeContext, Instruction, StackEdit } from '../Instruction';

export class IfThenElseInstruction extends AbstractBlockInstruction<OpCodes.if> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [] ]; }
    public readonly Else!: Instruction[];
    public get Then(): Instruction[] { return this.Block; }
    public constructor(thenType?: BlockType, then: Instruction[] = [], elseBlock: Instruction[]=[]) {
        super(OpCodes.if, thenType, then);
        protect(this, 'Else', elseBlock.slice(), true);
    }

    public override getDefinedTypes(): Types.FunctionType[] {
        let result = []
        result.push(
            ...this.Block
            .filter(i => i instanceof AbstractBlockInstruction)
            .map(b => (b as AbstractBlockInstruction).getDefinedTypes())
            .reduce((a, v) => (a.push(...v), a), []),
            ...this.Else
            .filter(i => i instanceof AbstractBlockInstruction)
            .map(b => (b as AbstractBlockInstruction).getDefinedTypes())
            .reduce((a, v) => (a.push(...v), a), [])
        );
        if (this.Type instanceof Types.FunctionType) { result.unshift(this.Type); }
        return result;
    }

    public override encodeBlock(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encodeBlock(encoder, context)
        if (this.Else.length) { encoder.uint8(OpCodes.else).array(this.Else, context); }
    }

    public override decode(decoder: IDecoder, context: ExpressionEncodeContext): void {
        context.blocks.unshift(this);
        let type = this.decodeType(decoder, context);
        let block = this.decodeBlock(decoder, context);
        let elseBlock: Instruction[] = [];
        if (decoder.uint8() === OpCodes.else) {
            elseBlock = this.decodeBlock(decoder, context);
            decoder.uint8();
        }
        if (context.blocks.shift() !== this) { throw new Error('Unexpected block on the context stack'); }
        this.Type = type;
        this.Block.length = 0;
        this.Block.push(...block);
        this.Else.length = 0;
        this.Else.push(...elseBlock);
    }
}
IfThenElseInstruction.registerInstruction(OpCodes.if);