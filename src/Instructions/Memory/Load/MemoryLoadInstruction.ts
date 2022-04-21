import { MemoryLoadInstructionCodes, MemoryManagementInstruction } from '../MemoryManagementInstruction';

export abstract class MemoryLoadInstruction<O extends MemoryLoadInstructionCodes> extends MemoryManagementInstruction<O> { }
