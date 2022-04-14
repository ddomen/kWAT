import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';

export type NumericConstInstructionCodes = OpCodes.i32_const | OpCodes.i64_const | OpCodes.f32_const | OpCodes.f64_const;
export abstract class NumericConstInstruction<O extends NumericConstInstructionCodes=NumericConstInstructionCodes> extends AbstractNumericInstruction<O> {
    public Value: number;
    protected constructor(code: O, value: number) { super(code); this.Value = value; }
}