import { Type } from "../../../Types";
import { OpCodes } from "../../../OpCodes";
import { MemoryLoadInstruction } from "./MemoryLoadInstruction";
import type { StackEdit } from "../../Instruction";

export class I32LoadInstruction extends MemoryLoadInstruction<OpCodes.i32_load> {
    public override get stack(): StackEdit { return [ [ Type.i32 ], [ Type.i32 ] ]; }
    private constructor() { super(OpCodes.i32_load); }
    public static readonly instance = new I32LoadInstruction();
}
I32LoadInstruction.registerInstruction(OpCodes.i32_load);