import { OpCodes } from '../../OpCodes';
import { AbstractCallInstruction } from './AbstractCallInstruction';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionContext, StackEdit } from '../Instruction';
import type * as Types from '../../Types';

export class CallInstruction extends AbstractCallInstruction<OpCodes.call> {
    public override get stack(): StackEdit { return [ this.Function.Parameters.slice(), this.Function.Results.slice() ]; }
    public Function: Types.FunctionType;
    public constructor(fn: Types.FunctionType) {
        super(OpCodes.call);
        this.Function = fn;
    }
    public getFunctionIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.TypeSection.indexOf(this.Function);
        if(!pass && index < 0) { throw new Error('Call Instruction invalid function reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let index = this.getFunctionIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(decoder: IDecoder, context: ExpressionContext): CallInstruction {
        let index = decoder.uint32();
        if (!context.module.FunctionSection.Functions[index]) { throw new Error('Call Instruction invalid function reference'); }
        return new CallInstruction(context.module.FunctionSection.Functions[index]!);
    }
}
CallInstruction.registerInstruction(OpCodes.call);