import { OpCodes } from '../../OpCodes';
import { ReferenceInstruction } from './ReferenceInstruction';
import type { ExpressionEncodeContext } from '../Instruction';
import type { IDecoder, IEncoder } from '../../Encoding';
import type * as Types from '../../Types';

export class ReferenceFunctionInstruction extends ReferenceInstruction<OpCodes.ref_func> {
    public Function: Types.FunctionType;
    public constructor(fn: Types.FunctionType) { super(OpCodes.ref_func); this.Function = fn; }
    public getFunctionIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.FunctionSection.indexOf(this.Function);
        if(!pass && index < 0) { throw new Error('Reference Instruction invalid function reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        let index = this.getFunctionIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(decoder: IDecoder, context: ExpressionEncodeContext): ReferenceFunctionInstruction {
        let index = decoder.uint32();
        if (!context.module.FunctionSection.Functions[index]) { throw new Error('Reference Instruction invalid function reference'); }
        return new ReferenceFunctionInstruction(context.module.FunctionSection.Functions[index]!);
    }
}
ReferenceFunctionInstruction.registerInstruction(OpCodes.ref_func);