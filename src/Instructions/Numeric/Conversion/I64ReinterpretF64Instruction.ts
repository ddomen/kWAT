import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class I64ReinterpretF64Instruction extends AbstractNumericInstruction<OpCodes.i64_reinterpret_f64> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_reinterpret_f64); }
    public static readonly instance = new I64ReinterpretF64Instruction();
}
I64ReinterpretF64Instruction.registerInstruction(OpCodes.i64_reinterpret_f64);