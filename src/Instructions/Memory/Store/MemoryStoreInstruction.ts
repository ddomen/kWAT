import { MemoryManagementInstruction, MemoryStoreInstructionCodes } from '../MemoryManagementInstruction';

export abstract class MemoryStoreInstruction<O extends MemoryStoreInstructionCodes> extends MemoryManagementInstruction<O> {}
