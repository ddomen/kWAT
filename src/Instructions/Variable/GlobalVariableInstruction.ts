import { AbstractVariableInstruction } from './AbstractVariableInstruction';
import { GlobalVariable } from '../../Sections';
import type { OpCodes } from '../../OpCodes';
import type { ExpressionEncodeContext, InstructionCtor } from '../Instruction';
import type { IDecoder, IEncoder } from '../../Encoding';

export type GlobalVariableInstructionCodes = OpCodes.global_get | OpCodes.global_set;
export abstract class GlobalVariableInstruction<O extends GlobalVariableInstructionCodes=GlobalVariableInstructionCodes>
    extends AbstractVariableInstruction<O> {
    public Variable: GlobalVariable;
    protected constructor(code: O, variable: GlobalVariable) { super(code); this.Variable = variable; }
    public getVariableIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.GlobalSection.Globals.indexOf(this.Variable);
        if (!pass && index < 0) { throw new Error('Global Variable Instruction invalid variable reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        let index = this.getVariableIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }

    public static override decode(
        this: InstructionCtor<GlobalVariableInstruction, [ GlobalVariable ]>,
        decoder: IDecoder,
        context: ExpressionEncodeContext
    ): GlobalVariableInstruction {
        return new this(decoder.decode(GlobalVariable, context.module));
    }
}