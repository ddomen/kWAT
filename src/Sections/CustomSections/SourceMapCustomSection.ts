import { CustomSection } from '../CustomSection';
import type { IDecoder, IEncoder } from '../../Encoding';

export class SourceMapSection extends CustomSection {
    public SourceMapUrl: string;
    public constructor(url: string='') { super('sourceMappingURL'); this.SourceMapUrl = url; }
    protected override encodeBytes(encoder: IEncoder): void { encoder.vector(this.SourceMapUrl); }
    protected override decodeBytes(decoder: IDecoder): void { this.SourceMapUrl = decoder.vector('utf8'); }
}
SourceMapSection.registerCustomType('sourceMappingURL');