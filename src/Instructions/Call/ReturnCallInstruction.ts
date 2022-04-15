import { OpCodes } from '../../OpCodes';
import { AbstractCallInstruction } from './AbstractCallInstruction';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionEncodeContext, StackEdit } from '../Instruction';
import type * as Types from '../../Types';

export class ReturnCallInstruction extends AbstractCallInstruction<OpCodes.return_call> {
    public override get stack(): StackEdit { return [ this.Function.Parameters.slice(), this.Function.Results.slice() ]; }
    public Function: Types.FunctionType;
    public constructor(fn: Types.FunctionType) {
        super(OpCodes.return_call);
        this.Function = fn;
    }
    public getFunctionIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.TypeSection.indexOf(this.Function);
        if(!pass && index < 0) { throw new Error('Call Instruction invalid function reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        if (!context.options.tailCall) { throw new Error('Tail call detected'); }
        let index = this.getFunctionIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(decoder: IDecoder, context: ExpressionEncodeContext): ReturnCallInstruction {
        let index = decoder.uint32();
        if (!context.module.FunctionSection.Functions[index]) { throw new Error('Call Instruction invalid function reference'); }
        return new ReturnCallInstruction(context.module.FunctionSection.Functions[index]!);
    }
}
ReturnCallInstruction.registerInstruction(OpCodes.call);