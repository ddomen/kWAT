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

import { CustomSection } from '../CustomSection';
import type { IDecoder, IEncoder } from '../../Encoding';

export class SourceMapSection extends CustomSection {
    public sourceMapUrl: string;
    public constructor(url: string='') { super('sourceMappingURL'); this.sourceMapUrl = url; }
    protected override encodeBytes(encoder: IEncoder): void { encoder.vector(this.sourceMapUrl); }
    protected override decodeBytes(decoder: IDecoder): void { this.sourceMapUrl = decoder.vector('utf8'); }
}
SourceMapSection.registerCustomType('sourceMappingURL');