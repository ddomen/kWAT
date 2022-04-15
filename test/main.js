const fs = require('fs')
const kwat = require('../dist').kwat;

let inFile, buf;
if (process.argv[2]) {
    inFile = process.argv[2];
    let a = fs.readFileSync(inFile);
    buf = new Uint8Array(a.byteLength);
    a.copy(buf);
}
else {
    const mod = kwat.module(m =>
        m
        .importFunction('console', 'log', fn => fn.parameter('i32', 'i32'))
        .importMemory('js', 'memory', 1)
        .function(fn => fn
                .parameter('i32')
                .bodyExpression(e => e.getLocal(0)
                    .constInt32(0)
                    .loadInt32()
                    .add('i32')
                    .return()
                )
                .result('i32'),
            'getAnswer'
        )
        .function(fn => 
            fn.bodyExpression(e => e
                    .constInt32(55, 97)
                    .call('console.log', true)
                    .constInt32(12)
                    .call('getAnswer')
                    .return()
                )
                .result('i32')
                .exportAs('main')
        )
    );
    buf = kwat.compile(mod);
    console.log(buf)
    inFile = './test/main.wasm';
    fs.writeFileSync(inFile, buf)
}
console.log('FILE:', inFile)
console.log(kwat.dump(buf),'\n\n\n---------------------')

const mem = new WebAssembly.Memory({ initial: 1 })
new Uint32Array(mem.buffer)[0] = 125;

const mod = new WebAssembly.Module(buf)
const ins = new WebAssembly.Instance(mod, {
    console,
    js: { memory: mem }
})
console.log('OUTPUT:', ins.exports.main());