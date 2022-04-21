const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

function unicorn(str, options) {
    return str.replace(/\{\{(\S+?)\}\}/g, (_, g) => options[g]);
}

const hasLicense = /\s*\/\*(\s*\*\s*)+Copyright/;

function makeLicense(filename, license, options) {
    const s = fs.readFileSync(filename, { encoding: 'utf8' });
    if (!hasLicense.test(s)) {
        const l = '/*\n' + unicorn(license, options)
            .split('\n')
            .map(x => ' * ' + x)
            .join('\n') + '\n */\n\n' + s;
        fs.writeFileSync(filename, l);
    }
}

function scanFolder(folder, license, options) {
    fs.readdirSync(folder)
    .map(f => path.join(folder, f))
    .forEach(f => {
        if (fs.statSync(f).isDirectory()) { scanFolder(f, license, options); }
        else { makeLicense(f, license, options); }
    });
}

scanFolder(
    path.join(__dirname, '..', 'src'),
    fs.readFileSync(path.join(__dirname, 'license'), { encoding: 'utf8' }),
    {
        year: new Date().getFullYear(),
        author: 'Daniele Domenichelli'
    }
);
