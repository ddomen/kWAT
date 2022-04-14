import { Instruction } from "../Instruction";
import type { OpCodes } from "../../OpCodes";

export abstract class ControlInstruction<O extends OpCodes=OpCodes> extends Instruction<O> { }
