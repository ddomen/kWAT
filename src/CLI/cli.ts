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

if (typeof(require) !== 'undefined' && typeof(module) !== 'undefined' && require.main === module) {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const args = (function(args){
            args = args.filter(a => a[0] === '-');
            let tmp: { [key: string]: string | boolean } = {}, a: [string, string | boolean];
            for (var i = 0; i < args.length; ++i) {
                a = args[i]!.split('=', 2) as [ string, string ];
                a[1] = typeof(a[1]) !== 'undefined' ? a[1] : true;
                tmp[a[0].substring(1)] = a[1];
            }
            return tmp;
        })(process.argv.slice(2));
    
        let files = process.argv.slice(2).filter(a => a[0] !== '-');
        
        if (files.length) {
            let d: string = (args['output'] || args['o'] || '') as any;
            if (typeof(d) !== 'string') { d = ''; }
            let s, f, o, od;
            for (let i in files) {
                f = files[i]!;
                if (!fs.existsSync(f) && f.substring(f.length - 4) != '.wat') { f += '.wat'; }
                if (!fs.existsSync(f)) { console.error('[FILE][ERROR]: File not found: ' + f); process.exit(1); break; }
                od = d || path.dirname(f);
                o = path.join(od, path.basename(f, '.wat') + '.wasm');
                if (fs.existsSync(o) && !(args['w'] || args['overwrite'])) {
                    console.error('[FILE][ERROR]: File \'' + o + '\' already existing, to overwrite it use -w or -overwrite flag');
                    process.exit(1);
                    break;
                }
    
                try { s = fs.readFileSync(f, { encoding: 'utf-8' }); }
                catch { console.error('[FILE][ERROR]: Can not open file: \'' + f + '\''); process.exit(1); break; }
                try { s = module.exports.parse(s.toString()); }
                catch (e) { console.error('[PARSE][ERROR]: Error during parsing of file \'' + f + '\' - ' + e); process.exit(1); break; }
                try { s = module.exports.compile(s); }
                catch (e) { console.error('[COMPILE][ERROR]: Error during compilation of file \'' + f + '\' - ' + e); process.exit(1); break; }
                try { fs.mkdirSync(od, { recursive: true }); fs.writeFileSync(o, s); }
                catch (e) { console.error('[FILE][ERROR]: Error during writing of file \'' + o + '\' - ' + e); process.exit(1); break; }
                console.log('[COMPILE][SUCCESS]: \'' + f + '\' -> \'' + o + '\'');
            }
        }
        else {
            console.error('[WASC][ERROR]: Need at least one input file to compile!');
            process.exit(1);
        }
    }
    catch (e) {
        console.error('[WASC][ERROR]: ' + e);
        process.exit(1);
    }
}