import { AbstractVariableInstruction } from './AbstractVariableInstruction';
import type { OpCodes } from '../../OpCodes';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionContext, InstructionCtor } from '../Instruction';

export type LocalVariableInstructionCodes = OpCodes.local_get | OpCodes.local_set | OpCodes.local_tee;
export abstract class LocalVariableInstruction<O extends LocalVariableInstructionCodes=LocalVariableInstructionCodes> extends AbstractVariableInstruction<O> {
    public Variable: number;
    protected constructor(code: O, index: number) { super(code); this.Variable = index; }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.uint32(this.Variable);
    }
    public static override decode(
        this: InstructionCtor<LocalVariableInstruction, [ number ]>,
        decoder: IDecoder,
        _?: ExpressionContext
    ): LocalVariableInstruction { return new this(decoder.uint32()); }
}