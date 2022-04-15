import { OpCodes } from '../../OpCodes';
import { ReferenceInstruction } from './ReferenceInstruction';
import * as Types from '../../Types'
import type { ExpressionDecodeContext, ExpressionEncodeContext } from '../Instruction';
import type { IDecoder, IEncoder } from '../../Encoding';

export class ReferenceNullInstruction extends ReferenceInstruction<OpCodes.ref_null> {
    public Type: Types.ReferenceType;
    public constructor(type: Types.ReferenceType) { super(OpCodes.ref_null); this.Type = type; }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.uint8(this.Type);
    }
    public static override decode(decoder: IDecoder, _?: ExpressionDecodeContext): ReferenceNullInstruction {
        return new ReferenceNullInstruction(decoder.uint8());
    }
    public static readonly FunctionRef = new ReferenceNullInstruction(Types.Type.funcref); 
    public static readonly ExternalRef = new ReferenceNullInstruction(Types.Type.externref); 
}
ReferenceNullInstruction.registerInstruction(OpCodes.ref_null);