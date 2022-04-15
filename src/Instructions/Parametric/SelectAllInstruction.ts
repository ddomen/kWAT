import { protect } from '../../internal';
import { OpCodes } from '../../OpCodes';
import { Type, ValueType } from '../../Types';
import { ParametricInstruction } from './ParametricInstruction';
import type { ExpressionDecodeContext, ExpressionEncodeContext, StackEdit } from '../Instruction';
import type { IDecoder, IEncoder } from '../../Encoding';

export class SelectAllInstruction extends ParametricInstruction<OpCodes.select_t> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [] ]; }
    public readonly Values!: ValueType[];
    public constructor(values: ValueType[]) { super(OpCodes.select_t); protect(this, 'Values', values.slice(), true); }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.vector(this.Values, 'uint32');
    }
    public static override decode(decoder: IDecoder, _?: ExpressionDecodeContext): SelectAllInstruction {
        return new SelectAllInstruction(decoder.vector('uint8'));
    }
}
SelectAllInstruction.registerInstruction(OpCodes.select_t);