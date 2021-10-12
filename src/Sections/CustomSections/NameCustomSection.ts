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

 import { KWatError } from '../../errors';
import { protect } from '../../internal';
import { CustomSection } from '../CustomSection';
import type { IDecoder, IEncodable, IEncoder } from '../../Encoding';

export class NameReference implements IEncodable {
    public index: number;
    public name: string;
    public constructor(index: number, name: string) {
        this.index = index;
        this.name = name;
    }
    public encode(encoder: IEncoder): any {
        encoder.uint32(this.index);
        encoder.string(this.name);
    }
    public static decode(decoder: IDecoder): NameReference {
        return new NameReference(
            decoder.uint32(),
            decoder.vector('utf8')
        );
    }
    
}

export enum NameSubSections {
    module    = 0x00,
    function  = 0x01,
    local     = 0x02
}
export class NameCustomSection extends CustomSection {
    public module: string | null;
    public readonly functions!: NameReference[];
    public readonly locals!: { [key: number]: NameReference[] };
    public constructor() {
        super('name', false);
        this.module = null;
        protect(this, 'functions', []);
        protect(this, 'locals', {});
    }

    public function(value: NameReference): boolean {
        let rv = this.functions.find(m => m.index === value.index);
        if (rv) { return false; }
        this.functions.push(value);
        return true;
    }
    public local(fnIndex: number, value: NameReference): boolean {
        if (!this.locals[fnIndex]) { this.locals[fnIndex] = []; }
        let rv = this.locals[fnIndex]!.find(m => m.index === value.index);
        if (rv) { return false; }
        this.locals[fnIndex]!.push(value);
        return true;
    }
    protected override encodeBytes(encoder: IEncoder): void {
        if (this.module !== null) {
            const e = encoder.spawn();
            e.string(this.module);
            encoder.uint8(NameSubSections.module).uint32(e.size).append(e);
        }
        if (this.functions.length) {
            const e = encoder.spawn();
            e.vector(this.functions);
            encoder.uint8(NameSubSections.function).uint32(e.size).append(e);
        }
        const locFns = Object.keys(this.locals);
        if (locFns.length) {
            const e = encoder.spawn();
            e.uint32(locFns.length);
            for (let k in this.locals) {
                e.uint32(parseInt(k)).vector(this.locals[k]!);
            }
            encoder.uint8(NameSubSections.local).uint32(e.size).append(e);
        }
    }
    protected override decodeBytes(decoder: IDecoder): void {
        this.module = null;
        this.functions.length = 0;
        for (const k in this.locals) { delete this.locals[k]; }

        while (decoder.remaining) {
            const type = decoder.uint8();
            const size = decoder.uint32();
            const d = decoder.slice(size);
            switch (type) {
                case NameSubSections.module:
                    this.module = d.vector('utf8'); break;
                case NameSubSections.function:
                    this.functions.push(...d.vector(NameReference)); break;
                case NameSubSections.local: {
                    const n = d.uint32();
                    for (let i = 0; i < n; ++i) {
                        const k = d.uint32();
                        this.locals[k] = this.locals[k] || [];
                        this.locals[k]!.push(...d.vector(NameReference));
                    }
                    break;
                }
                default: throw new KWatError('Unrecognized subsection');
            }
        }
    }
}
NameCustomSection.registerCustomType('name');