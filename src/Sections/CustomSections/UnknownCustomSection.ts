import { protect } from '../../internal';
import { CustomSection } from '../CustomSection';
import type { IDecoder, IEncoder } from '../../Encoding';

export class UnkownCustomSection extends CustomSection {
    public override Name!: string;
    public readonly Bytes!: number[];
    public constructor(name: string) {
        super(name, false);
        protect(this, 'Bytes', [], true);
    }

    protected override encodeBytes(encoder: IEncoder): void { encoder.append(this.Bytes); }
    protected override decodeBytes(decoder: IDecoder): void {
        this.Bytes.length = 0;
        this.Bytes.push(...decoder.read(decoder.remaining));
    }
}
UnkownCustomSection.registerCustomType('unknown')