import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { NumericConstInstruction } from './NumericConstInstruction';
import type { IDecoder, IEncoder } from '../../../Encoding'
import type { ExpressionContext, StackEdit } from '../../Instruction';

export class F32ConstInstruction extends NumericConstInstruction<OpCodes.f32_const> {
    public override get stack(): StackEdit { return [ [], [ Type.f32 ] ] }
    public constructor(value: number = 0) {super(OpCodes.f32_const, value); }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        encoder.float32(this.Value)
    }
    public static override decode(decoder: IDecoder): F32ConstInstruction {
        return new F32ConstInstruction(decoder.float32());
    }
}
F32ConstInstruction.registerInstruction(OpCodes.f32_const)