import { OpCodes } from "../../OpCodes";
import { AbstractBranchInstruction } from "./AbstractBranchInstruction";
import * as Types from '../../Types';
import type { StackEdit } from "../Instruction";
import type { AbstractBlockInstruction } from "../Block";

export class BranchIfInstruction extends AbstractBranchInstruction<OpCodes.br_if> {
    public override get stack(): StackEdit { return [ [ Types.Type.i32 ], [] ]; }
    constructor(target: AbstractBlockInstruction) { super(OpCodes.br_if, target); }
}
BranchIfInstruction.registerInstruction(OpCodes.br_if);