import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { NumericConstInstruction } from './NumericConstInstruction';
import type { IDecoder, IEncoder } from '../../../Encoding';
import type { ExpressionEncodeContext, StackEdit } from '../../Instruction';

export class I64ConstInstruction extends NumericConstInstruction<OpCodes.i64_const> {
    public override get stack(): StackEdit { return [ [], [ Type.i64 ] ] }
    public constructor(value: number | bigint = 0) {super(OpCodes.i64_const, value as number); }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.int64(this.Value)
    }
    public static override decode(decoder: IDecoder): I64ConstInstruction {
        return new I64ConstInstruction(decoder.uint64());
    }
}
I64ConstInstruction.registerInstruction(OpCodes.i64_const);