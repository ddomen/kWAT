import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { NumericConstInstruction } from './NumericConstInstruction';
import type { IDecoder, IEncoder } from '../../../Encoding'
import type { ExpressionEncodeContext, StackEdit } from '../../Instruction';

export class I32ConstInstruction extends NumericConstInstruction<OpCodes.i32_const> {
    public override get stack(): StackEdit { return [ [], [ Type.i32 ] ] }
    public constructor(value: number = 0) {super(OpCodes.i32_const, value); }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.int32(this.Value | 0)
    }
    public static override decode(decoder: IDecoder): I32ConstInstruction {
        return new I32ConstInstruction(decoder.uint32());
    }
}
I32ConstInstruction.registerInstruction(OpCodes.i32_const);