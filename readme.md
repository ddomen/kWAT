# KWat
[![License](https://img.shields.io/badge/License-GPL3-1a237e)](./LICENSE)
[![Contact](https://img.shields.io/badge/Contact-email-00897b)](mailto:daniele.domenichelli.5+ddomen@gmail.com)
[![Donate](https://img.shields.io/badge/Donate-PayPal-4caf50)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=6QCNG6UMSRCPC&lc=GB&item_name=ddomen&item_number=aoop&no_note=0&cn=Add%20a%20message%3a&no_shipping=2&currency_code=EUR&bn=PP%2dDonationsBF%3abtn_donate_SM%2egif%3aNonHosted)

**WebAssembly toolkit**

A handful of tools useful to work with WebAssembly directly from JavaScript. It can be used in Node.js as well as Browsers.

## Installing
Install this library is easy by using npm:
```
npm install kwat
```

## Usage

### Buffers
Many of the functionalities of this library focus on the ability to interpret binary data. In order to retrieve WebAssembly in a binary follow these steps:

**File System**

0. Compile your source to a `.wasm` binary file
1. Read the file in a binary buffer:
```js
const fs = require('fs');
const buffer = fs.readFyleSync(myFilePath);
```
**Browser**

0. Compile your source to a `.wasm` binary file
1. Read the file in a binary buffer:
```js
fetch(myHttpPath)
    .then(res => res.arraybuffer())
    .then(buffer => { /* your buffer usage here */ });
```

### Reading
***KWat*** exposes two ways to read the content of a bianry WebAssembly buffer. The first is the raw analysis of a buffer, called `Dumping`, the second is the decompilation into a structure, called `Module`, which contains all the information encapsulated in the buffer.

#### Dumping
This tool contains:
- `dump` - a method which commutes a WebAssembly binary module into a descriptive textual human-readable dump.
- `Reader` - a class that exposes a series of events to unpack and analyze a WebAssembly binary module.

`Reader` example:
```ts
// import { Reader } from 'kwat/Dumping';
const Reader = require('kwat/Dumping').Reader;
// create the reader 
const r = new Reader(myBuffer);
// bind an event callback
r.on(myReadEvent, evt => console.log(evt));
// bind the error event callback
r.on('error', err => console.error(err.index, err.error))
// execute the analysis
r.read();
```

Note that the `Reader` will try to parse the buffer even if the given module is not valid. It will try to make sense of the given data without validating the input.

### Module
A module is an object representation of a WebAssembly Module (from a binary format). It contains all the sections described in the buffer, accessible with object properties. It can be instantiated as an empty module, edited and encoded into a new buffer, or either loaded from a already in memory buffer.

As it is complex to work with module objects, there are helpers functions which enable to read, edit and write modules with ease. These are described later.

```js
const decompile = require('kwat/Compilation').decompile;

const mod = decompile(myBuffer);

console.log('Module Version: ' + mod.version);
console.log('Module Imports: #' + mod.importSection.imports.length);
console.log('Module Exports: #' + mod.exportSection.exports.length);
console.log('Module declared Functions: #' + mod.functionSection.functions.length);
console.log('Module Custom Sections: ' + mod.customSections.length)
console.log('Module Custom Section names:', ...mod.customSections.map(s => s.name))
```

### Write
In order to writing WebAssembly modules in binary format with ***KWat***, you can recour to the `Module` class briefly described above. However, there are helper functions to accomplish this hard task:

```js
const compile = require('kwat/Compilation').compile;
const outBuffer = compile(myModule);
```

### Building
The most useful way to edit and build a module is to using the provided ***KWat*** builders, available from the static method of the `Module` class:

```js
const Module = require('kwat').Module;

const myModule = Module.build(mod => mod
    .importFunction('sys', 'print', import => import // (func $sys_print (import "sys" "print")
        .parameter('i32', 'i32')                     //     (param i32) (param i32))
    )
    .function(func => func             // (func $getAnswer
        .parameter('i32')              //     (param i32)
        .result('i32')                 //     (result i32)
        .bodyExpression(exp => exp
            .getLocal(0)               //     local.get 0
            .constInt32(32)            //     i32.const 32
            .add('i32')                //     i32.add
            .return()                  //     return)
        ),
        '$getAnswer'                   // assigning label $getAnser
    )
    .function(func => func             // (func
        .exportAs('main')              //     (export "main")
        .result('i32')                 //     (result i32)
        .bodyExpression(exp => exp
            .const(55, 'i32')          //     i32.const 55
            .constInt32(97)            //     i32.const 97
            .call('sys.print', true)   //     call $sys_print
            .const(10)                 //     i32.const 10
            .call('$getAnswer')        //     call $getAnswer
            .return()                  //     return)
        )
    )
);
```

### Compilation
In order to compile a `Module` to a binary WebAssembly module representation, there is a helper function which takes a module and produces a buffer:
```js
const compile = require('kwat/Compilation').compile;
const buff = compile(myModule);

// simple execution example

```

## In Progress
### CLI
A command line interface for the read/write tools.

### Runtime
A runtime capable to execute WebAssembly modules/buffer in any JavaScript, completely environment independent.