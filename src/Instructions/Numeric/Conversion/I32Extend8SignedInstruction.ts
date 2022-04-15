import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { IEncoder } from '../../../Encoding';
import type { ExpressionEncodeContext, StackEdit } from '../../Instruction';

export class I32Extend8SignedInstruction extends AbstractNumericInstruction<OpCodes.i32_extend8_s> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ] }
    private constructor() { super(OpCodes.i32_extend8_s); }
    public override encode(encoder: IEncoder, ctx: ExpressionEncodeContext): void {
        if (!ctx.options.signExtension) { throw new Error('Sign extension instruction detected'); }
        super.encode(encoder, ctx);
    }
    public static readonly instance = new I32Extend8SignedInstruction();
}
I32Extend8SignedInstruction.registerInstruction(OpCodes.i32_extend8_s);