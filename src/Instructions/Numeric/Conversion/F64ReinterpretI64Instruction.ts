import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64ReinterpretI64Instruction extends AbstractNumericInstruction<OpCodes.f64_reinterpret_i64> {
    public override get stack(): StackEdit { return [ [ Type.i64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_reinterpret_i64); }
    public static readonly instance = new F64ReinterpretI64Instruction();
}
F64ReinterpretI64Instruction.registerInstruction(OpCodes.f64_reinterpret_i64);