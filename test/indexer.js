const fs = require('fs')
const path = require('path')
const base = './src/Structure/Instructions/Numeric'
function index(b) {
    let f = [];
    let i = [];
    fs.readdirSync(b).map(d => path.join(b, d)).forEach(fn => {
        if (fs.statSync(fn).isDirectory()) { index(fn); f.push(fn);  }
        else { i.push(fn); }
    });
    let s = '';
    if (f.length) {
        f = f.map(fn => 'export * from \'./' + path.basename(fn) + '\';').join('\n') + '\n'
        s += f + '\n';
    }
    i = i.filter(fn => !fn.endsWith('index.ts'))
            .map(fn => 'export * from \'./' + path.basename(fn, '.ts') + '\';').join('\n')
    s += i;
    fs.writeFileSync(path.join(b, 'index.ts'), s);
}
index(base)