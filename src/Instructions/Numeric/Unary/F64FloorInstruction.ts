import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64FloorInstruction extends AbstractNumericInstruction<OpCodes.f64_floor> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_floor); }
    public static readonly instance = new F64FloorInstruction();
}
F64FloorInstruction.registerInstruction(OpCodes.f64_floor);