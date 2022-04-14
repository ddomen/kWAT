import { Type } from '../../Types';
import { OpCodes } from '../../OpCodes';
import { ParametricInstruction } from './ParametricInstruction';
import type { StackEdit } from '../Instruction';


export class SelectInstruction extends ParametricInstruction<OpCodes.select> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [] ]; }
    private constructor() { super(OpCodes.select); }
    public static readonly instance = new SelectInstruction();
}
SelectInstruction.registerInstruction(OpCodes.select);