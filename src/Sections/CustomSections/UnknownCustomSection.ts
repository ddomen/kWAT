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

import { protect } from '../../internal';
import { CustomSection } from '../CustomSection';
import type { IDecoder, IEncoder } from '../../Encoding';

export class UnkownCustomSection extends CustomSection {
    public override name!: string;
    public readonly bytes!: number[];
    public constructor(name: string) {
        super(name, false);
        protect(this, 'bytes', [], true);
    }

    protected override encodeBytes(encoder: IEncoder): void { encoder.append(this.bytes); }
    protected override decodeBytes(decoder: IDecoder): void {
        this.bytes.length = 0;
        this.bytes.push(...decoder.read(decoder.remaining));
    }
}
UnkownCustomSection.registerCustomType('unknown')