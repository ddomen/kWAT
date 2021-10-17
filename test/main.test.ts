import 'jasmine'
import * as WAC from '../dist'
import * as JU from './jutils'

describe('Encoder Test', () => {
    const encoder = new WAC.Structure.Encoder();
    const reset = () => (encoder as any)._data = [];

    it('supports uint8', () => {
        let v = new DataView(new ArrayBuffer(1)), b: Uint8Array;
        for (let i = 0; i < 255; ++i) {
            v.setUint8(0, i);
            encoder.uint8(i);
            b = encoder.getBuffer()
            expect(b.byteLength).toBe(1);
            expect(b[0]).withContext('value: ' + i).toBe(v.getUint8(0));
            reset();
        }
    });
    it('supports uint32 relaxed', () => {
        let v = new DataView(new ArrayBuffer(4)), b: Uint8Array;
        for (let i = 0; i < 0xffffffff; i += 4295) {
            v.setUint32(0, i, true);
            encoder.uint32(i, true);
            b = encoder.getBuffer()
            expect(b).withContext('value: ' + i).toEqual(new Uint8Array(v.buffer));
            reset();
        }
    });
    {
        it('supports uint64 relaxed', () => {
            let v = new DataView(new ArrayBuffer(8)), b: Uint8Array;
            const m = BigInt('0xffffffffffffffff');
            const s = BigInt('0x4189374bc6a5c8');
            for (let i = BigInt(0); i < m; i += s) {
                v.setBigUint64(0, i, true);
                encoder.uint64(i, true);
                b = encoder.getBuffer()
                expect(b).withContext('value: ' + i).toEqual(new Uint8Array(v.buffer));
                reset();
            }
        });
    }

    // private _data;
    // get size(): number;
    // getBuffer(): Uint8Array;
    // uint8(value: number): this;
    // uint32(value: number, relaxed?: boolean): this;
    // uint64(value: number, relaxed?: boolean): this;
    // uint64(hi: number, lo: number, relaxed?: boolean): this;
    // int32(value: number): this;
    // float32(value: number): this;
    // float64(value: number): this;
    // vector(value: IEncodable<undefined>[]): this;
    // vector<C>(value: IEncodable<C>[], context: C): this;
    // vector(value: string, type?: 'utf8'): this;
    // vector(value: string[], type?: 'utf8'): this;
    // vector(value: number[], type: 'uint64'): this;
    // vector(value: number[], type: 'uint32', relaxed?: boolean): this;
    // vector(value: number[], type: EncodeType, ...args: any[]): this;
    // array(value: IEncodable<undefined>[]): this;
    // array<C>(value: IEncodable<C>[], context: C): this;
    // array(value: string, type?: 'utf8'): this;
    // array(value: string[], type?: 'utf8'): this;
    // array(value: number[], type: 'uint64'): this;
    // array(value: number[], type: 'uint32', relaxed?: boolean): this;
    // array(value: number[], type: EncodeType, ...args: any[]): this;
    // string(value: string): this;
    // utf8(value: string): this;
    // encode(value: IEncodable<undefined>): this;
    // encode<C>(value: IEncodable<C>, context: C): this;
    // append(data: IEncoder | NumericArray): this;
    // spawn(): IEncoder;
})

describe('Expression Test', () => {


    it('has instance if no constructor parameter', () => {
        WAC.Structure.Expression.AllInstructionsTypes.forEach(e =>
            expect(
                JU.countParams(e) == 0 ?
                !!(e as any).instance : 
                true
            ).toBeTrue()
        )
    })

})

// describe('Expression Builder Test', () => {

// })

// describe('Module Builder Test', () => {
//     let m = new WAC.Structure.Module();
//     m.defineFunction(b => 
//         b.result('i32')
//          .bodyExpression(e => e.const(0xefffffff, 'i32').return())
//          .exportAs('main')
//     )
//     it('has ')
// })

// (async function() {
//     console.log('BUILDING')
//         let m = new wac.Structure.Module();
//         m.defineFunction(b => 
//             b.result('i32')
//              .bodyExpression(e => e.const(0xefffffff, 'i32').return())
//              .exportAs('main')
//         )
//     console.log('DONE')

//     console.log('COMPILE')
//         let buf = wac.compile(m);
//         fs.writeFileSync('_test.wasm', buf);
//     console.log('DONE')
    
//     console.log('LOAD')
//         let was = await WebAssembly.instantiate(buf)
//     console.log('DONE')

//     console.log(was.instance.exports)

//     console.log('EXECUTING')
//         console.log(was.instance.exports.main())
//     console.log('DONE')

//     console.log('DECOMPILATION')
//     let dm = wac.decompile(fs.readFileSync('_test.wasm'))
//     let cbuf = wac.compile(dm)
//     if (buf.length != cbuf.length || buf.some((x, i) => x != cbuf[i])) {
//         console.error('ERROR: BUF != CBUF')
//     }
//     else { console.log('SUCCESS'); }
// })()
