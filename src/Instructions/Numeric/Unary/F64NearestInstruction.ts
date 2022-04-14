import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { StackEdit } from '../../Instruction';

export class F64NearestInstruction extends AbstractNumericInstruction<OpCodes.f64_nearest> {
    public override get stack(): StackEdit { return [ [ Type.f64 ], [ Type.f64 ] ] }
    private constructor() { super(OpCodes.f64_nearest); }
    public static readonly instance = new F64NearestInstruction();
}
F64NearestInstruction.registerInstruction(OpCodes.f64_nearest);