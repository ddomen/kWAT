import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { IEncoder } from '../../../Encoding';
import type { ExpressionEncodeContext, StackEdit } from '../../Instruction';

export class I64Extend8SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend8_s> {
    public override get stack(): StackEdit { return [ [ Type.i64 ], [ Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_extend8_s); }
    public override encode(encoder: IEncoder, ctx: ExpressionEncodeContext): void {
        if (!ctx.options.signExtension) { throw new Error('Sign extension instruction detected'); }
        super.encode(encoder, ctx);
    }
    public static readonly instance = new I64Extend8SignedInstruction();
}
I64Extend8SignedInstruction.registerInstruction(OpCodes.i64_extend8_s);