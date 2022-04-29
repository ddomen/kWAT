const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

function unicorn(str, options) {
    return str.replace(/\{\{(\S+?)\}\}/g, (_, g) => options[g]);
}

const hasLicense = /\s*\/\*(\s*\*\s*)+Copyright/;
const getLicense = /^\s*\/\*(\s*\*[^\n]*)*Copyright\s*[^\n]*(\s*\*[^\n]+)*\s*\*\/\s*/g;

function makeLicense(filename, license, data, options) {
    let s = fs.readFileSync(filename, { encoding: 'utf8' });
    if (options.force || !hasLicense.test(s)) {
        s = s.replace(getLicense, '');
        let q = unicorn(license, data).split('\n');
        q.length && (q[0] = '@license ' + q[0]);
        q = q.map(x => '  * ' + x).join('\n');
        const l = '/**\n' + q + '\n  */\n\n' + s;
        console.log('Licensing:', filename)    
        fs.writeFileSync(filename, l);
    }
}

function scanFolder(folder, license, data, options) {
    fs.readdirSync(folder)
    .map(f => path.join(folder, f))
    .forEach(f => {
        if (fs.statSync(f).isDirectory()) { scanFolder(f, license, data, options); }
        else { makeLicense(f, license, data, options); }
    });
}

scanFolder(
    path.join(__dirname, '..', 'src'),
    fs.readFileSync(path.join(__dirname, 'license'), { encoding: 'utf8' }),
    {
        year: new Date().getFullYear(),
        author: pkg.author.replace(/\s*\<[^>]+\>\s*/g, '').trim(),
        fullAuthor: pkg.author,
        version: pkg.version,
        package: pkg.name,
        licenseType: pkg.license,
        repository: pkg.repository.url,
        description: pkg.description
    },
    {
        force: process.argv.includes('-f') || process.argv.includes('--force')
    }
);
