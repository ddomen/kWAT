import {
    Module,
    Compilation,
    Dumping
} from '../src'
import * as fs from 'node:fs'

const mod = Module.build(m =>
    m
    .importFunction('console', 'log', fn => fn.parameter('i32', 'i32'))
    .function(fn => fn
            .parameter('i32')
            .bodyExpression(e => e.getLocal(0).constInt32(32).add('i32').return())
            .result('i32'),
        'getAnswer'
    )
    .function(fn => 
        fn.bodyExpression(e => e
                .constInt32(55, 97)
                .call('console.log', true)
                .constInt32(10)
                .call('getAnswer')
                .return()
            )
            .result('i32')
            .exportAs('main')
    )
)

let buf = Compilation.compile(mod);
fs.writeFileSync('./test/main.wasm', buf)
let m = Compilation.decompile(buf);
console.log(m)
console.log('\n\n=====')
console.log(Dumping.dump(buf))
console.log('=====\n\n')
WebAssembly.instantiate(buf, { console: { log: (a: number, b: number) => console.log('LOG', a, b) } }).then(wm => {
    const main = wm.instance.exports['main'] as Function;
    console.log(main());
})
.catch(ex => console.error(ex))