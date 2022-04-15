import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { NumericConstInstruction } from './NumericConstInstruction';
import type { IDecoder, IEncoder } from '../../../Encoding'
import type { ExpressionEncodeContext, StackEdit } from '../../Instruction';

export class F64ConstInstruction extends NumericConstInstruction<OpCodes.f64_const> {
    public override get stack(): StackEdit { return [ [], [ Type.f64 ] ] }
    public constructor(value: number = 0) { super(OpCodes.f64_const, value); }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.float64(this.Value)
    }
    public static override decode(decoder: IDecoder): F64ConstInstruction {
        return new F64ConstInstruction(decoder.float64());
    }
}
F64ConstInstruction.registerInstruction(OpCodes.f64_const)