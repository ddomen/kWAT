/**
  * @license kwat 0.1.0 Copyright (C) 2022 Daniele Domenichelli
  * 
  * This program is free software: you can redistribute it and/or modify
  * it under the terms of the GNU General Public License as published by
  * the Free Software Foundation, either version 3 of the License, or
  * (at your option) any later version.
  * 
  * This program is distributed in the hope that it will be useful,
  * but WITHOUT ANY WARRANTY; without even the implied warranty of
  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  * GNU General Public License for more details.
  * 
  * You should have received a copy of the GNU General Public License
  * along with this program.  If not, see <https://www.gnu.org/licenses/>.
  */

import { ControlInstruction } from '../Control/ControlInstruction';
import type { OpCodes } from '../../OpCodes';

export type CallInstructionCodes = OpCodes.call | OpCodes.call_indirect |
                                    OpCodes.return_call | OpCodes.return_call_indirect;
export abstract class AbstractCallInstruction<O extends CallInstructionCodes=CallInstructionCodes> extends ControlInstruction<O> { }