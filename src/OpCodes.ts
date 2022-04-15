/** Enumeration of all available non-reserved
 * instructions for WebAssembly v1
 */
export enum OpCodes {
    /** Unconditional trap - causes runtime error
     * 
     * `(unreachable)`
     * 
     * `[t\*1] --> [t\*2]`
     * */
    unreachable               = 0x00,
    /** Does nothing
     * 
     * `(nop)`
     * 
     * `[] --> []`
     * */
    nop                       = 0x01,
    /** Define a label for the end of instruction block
     * 
     * `(block $label ...)`
     * 
     * `[t\*1] --> [t\*2]`
     */
    block                     = 0x02,
    /** Define a label for the start of the instruction block
     * 
     * `(loop $label ...)`
     * 
     * `[t\*1] --> [t\*2]`
     */
    loop                      = 0x03,
    /** Start an if-then[-else] structure
     * 
     * `(if (then ...) (else ...))`
     * 
     * `[t\*1, i32] --> [t\*2]`
     */
    if                        = 0x04,
    /** Conclude an if-then-else structure
     * 
     * `(if (then ...) (else ...))`
     */
    else                      = 0x05,
    /** Begins a block which can handle thrown exceptions
     * 
     * ### #Exceptions
     * 
     * `(try $label (...))`
     */
    try                       = 0x06,
    /** Begins the catch block of a try block
     * 
     * ### #Exceptions
     * 
     * `(cacth $tryLabel (...))`
     */
    catch                      = 0x07,
    /** Creates an exception defined by the tag
     * and then throws it.
     * 
     * ### #Exceptions
     * 
     * `(throw $exceptionTag)`
     */
    throw                       = 0x08,
    /** Pops the `externref` on top of the stack
     * and throws it
     * 
     * ### #Exceptions
     * 
     * `(rethrow $catchLabel)`
     */
    rethrow                     = 0x09,
    /** End a block or a function (omittiable in text format)
     * 
     * `(end)`
     * 
     * `[t\*1, i32] --> [t\*2]`
     */
    end                       = 0x0b,
    /** Branch (jump) to a structured block
     * 
     * `(br $label)`
     * 
     * `[t\*1, t\*] --> [t\*2]`
     */
    br                        = 0x0c,
    /** Branch (jump) unconditionally to a structured block if the stack is not zero
     * 
     * `(br_if $label)`
     * 
     * `[t\*, i32] --> [t\*]`
     */
    br_if                     = 0x0d,
    /** Branch (jump) to a structured block with an indexing label
     * 
     * `(br_table $label0 $label1 ...$labels)`
     * 
     * `[t1\*, t\*, i32] --> [t2\*]`
     */
    br_table                  = 0x0e,
    /** Return from the current function.
     * Same as unconditional branch to the outmost
     * 
     * `(return)`
     * 
     * `[t1\*, t\*] --> [t2\*]`
     */
    return                    = 0x0f,
    /** Call another function consuming the necessary arguments and returning the results.
     * 
     * `(call $function)`
     * 
     * `[t1\*] --> [t2\*]`
     */
    call                      = 0x10,
    /** Call another function consuming the necessary arguments and returning the results.
     * The function is retrieved by indexing into a table.
     * Since the table can contains `anyfunc` type (functions of any type), the callee is
     * dynamically checked against the function type indexed by the instruction's second immediate,
     * and the call is aborted with a trap (runtime error) if it does not match.
     * 
     * `(call_indirect $tableIndex (type $functionType))`
     * 
     * `[t1\*, i32] --> [t2\*]`
     */
    call_indirect             = 0x11,
    
    /** Call another function consuming the necessary arguments and returning the results.
     * The function will be threated as a tail recursive.
     * This instruction will combine the function call and a return instruction
     * such that the compiler knows about the tail recursion.
     * 
     * ### #Tail call
     * 
     * `(return_call $function)`
     * 
     * `[t1\*] --> [t2\*]`
     */
    return_call              = 0x12,
    /** Call another function consuming the necessary arguments and returning the results.
     * The function is retrieved by indexing into a table.
     * Since the table can contains `anyfunc` type (functions of any type), the callee is
     * dynamically checked against the function type indexed by the instruction's second immediate,
     * and the call is aborted with a trap (runtime error) if it does not match.
     * The function will be threated as a tail recursive.
     * This instruction will combine the function call and a return instruction
     * such that the compiler knows about the tail recursion.
     * 
     * ### #Tail call
     * 
     * `(return_call_indirect $tableIndex (type $functionType))`
     * 
     * `[t1\*, i32] --> [t2\*]`
     */
    return_call_indirect     = 0x13,
    /** Begins the delegate block of a try block
     * 
     * ### #Exceptions
     * 
     * `(delegate $tryLabel (...))`
     */
    delegate                  = 0x18,
    /** Begins the catch_all block of a try block
     * 
     * ### #Exceptions
     * 
     * `(cacth_all (...))`
     */
     catch_all                = 0x19,
    /** Pop (or drop) an element from the stack
     * 
     * `(drop)`
     * 
     * `[t] --> []`
     */
    drop                      = 0x1a,
    /** Ternary operator: the last element of the stack is the checker,
     * if it is zero the second last element is selected, the third last otherwise:
     * 
     * `stack: [$1, $2, $3] --> ($3 ? $1 : $2)`
     * 
     * `(select)`
     * 
     * `[t, t, i32] --> [t]`
     */
    select                    = 0x1b,
    /** Ternary operator: the last element of the stack is the checker,
     * if it is zero the second last element is selected, the third last otherwise:
     * 
     * `stack: [$1, $2, $3] --> ($3 ? $1 : $2)`
     * 
     * When included a value type (select_t isntead of select),
     * both the operands must be of the given type.
     * 
     * `(select $valueType)`
     * 
     * `[t, t, i32] --> [t]`
     */
    select_t                  = 0x1c,
    /** Load into the stack the given local variable
     * 
     * `(local.get $index)`
     * 
     * `[] --> [t]`
     */
    local_get                 = 0x20,
    /** Store into the given local variable the value in the stack
     * 
     * `(local.set $index)`
     * 
     * `[t] --> []`
     */
    local_set                 = 0x21,
    /** Store into the given local variable the value in the stack
     * and repush into the stack the argument
     * 
     * `(local.tee $index)`
     * 
     * `[t] --> [t]`
     */
    local_tee                 = 0x22,
    /** Load into the stack the given global variable
     * 
     * `(local.get $index)`
     * 
     * `[] --> [t]`
     */
    global_get                = 0x23,
    /** Store into the given global variable the value in the stack.
     * Note that the global variable ***must*** be mutable `(mut)`
     * 
     * `(local.set $index)`
     * 
     * `[t] --> []`
     */
    global_set                = 0x24,
    /** Load into the stack the element at the table index
     * (assumes table 0 if omitted since there should be only one table in WASM-v1)
     * 
     * `(table.get [$table])`
     * 
     * `[i32] --> [t]`
     */
    table_get                 = 0x25,
    /** Load into the stack the element at the table index
     * (assumes table 0 if omitted since there should be only one table in WASM-v1)
     * 
     * `(table.set [$table])`
     * 
     * `[i32, t] --> []`
     */
    table_set                 = 0x26,
    /** Load into the stack the element at the memory index.
     * Reads 4 consecutives bytes from the given index as a (signed) i32 [±2.147.483.647]:
     * `[ index, index+1, index+2, index+3 ] -> i32`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(i32.load [$memory])`
     * 
     * `[i32] --> [i32]`
     */
    i32_load                  = 0x28,
    /** Load into the stack the element at the memory index.
     * Reads 8 consecutives bytes from the given index as a (signed) i64 [±9.223.372.036.854.775.807]:
     * `[ index, index+1, ..., index+7 ] -> i64`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(i64.load [$memory])`
     * 
     * `[i32] --> [i64]`
     */
    i64_load                  = 0x29,
    /** Load into the stack the element at the memory index.
     * Reads 4 consecutives bytes from the given index as a f32 [1.175e-38, 3.403e38]:
     * `[ index, index+1, index+2, index+3 ] -> f32`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(f32.load [$memory])`
     * 
     * `[i32] --> [f32]`
     */
    f32_load                  = 0x2a,
    /** Load into the stack the element at the memory index.
     * Reads 8 consecutives bytes from the given index as a f64 [2.225e-308, 1.798e308]:
     * `[ index, index+1, ..., index+7 ] -> f64`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(f64.load [$memory])`
     * 
     * `[i32] --> [f64]`
     */
    f64_load                  = 0x2b,
    /** Load into the stack the element at the memory index.
     * Reads 1 byte from the given index as a signed i32 [-127, 128]:
     * `[ index ] -> i32`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(i32.load8_s [$memory])`
     * 
     * `[i32] --> [i32]`
     */
    i32_load8_s               = 0x2c,
    /** Load into the stack the element at the memory index.
     * Reads 1 byte from the given index as a unsigned i32 [0, 255]:
     * `[ index ] -> i32`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(i32.load8_s [$memory])`
     * 
     * `[i32] --> [i32]`
     */
    i32_load8_u               = 0x2d,
    /** Load into the stack the element at the memory index.
     * Reads 2 consecutive byte from the given index as a signed i32 [±32.767]:
     * `[ index, index+1 ] -> i32`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(i32.load16_s [$memory])`
     * 
     * `[i32] --> [i32]`
     */
    i32_load16_s              = 0x2e,
    /** Load into the stack the element at the memory index.
     * Reads 2 consecutive byte from the given index as a unsigned i32 [0, 65.535]:
     * `[ index, index+1 ] -> i32`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(i32.load16_s [$memory])`
     * 
     * `[i32] --> [i32]`
     */
    i32_load16_u              = 0x2f,
    /** Load into the stack the element at the memory index.
     * Reads 1 byte from the given index as a signed i64 [0, 255]:
     * `[ index ] -> i64`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(i64.load8_s [$memory])`
     * 
     * `[i32] --> [i64]`
     */
    i64_load8_s               = 0x30,
    /** Load into the stack the element at the memory index.
     * Reads 1 byte from the given index as a unsigned i64 [0, 255]:
     * `[ index ] -> i64`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(i64.load8_s [$memory])`
     * 
     * `[i32] --> [i64]`
     */
    i64_load8_u               = 0x31,
    /** Load into the stack the element at the memory index.
     * Reads 2 consecutive byte from the given index as a signed i64 [±32.767]:
     * `[ index, index+1 ] -> i64`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(i64.load16_s [$memory])`
     * 
     * `[i32] --> [i64]`
     */
    i64_load16_s              = 0x32,
    /** Load into the stack the element at the memory index.
     * Reads 2 consecutive byte from the given index as a unsigned i64 [0, 65.535]:
     * `[ index, index+1 ] -> i64`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(i64.load16_s [$memory])`
     * 
     * `[i32] --> [i64]`
     */
    i64_load16_u              = 0x33,
    /** Load into the stack the element at the memory index.
     * Reads 4 consecutive byte from the given index as a signed i64 [±2.147.483.647]:
     * `[ index, index+1, index+2, index+3 ] -> i64`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(i64.load32_s [$memory])`
     * 
     * `[i32] --> [i64]`
     */
    i64_load32_s              = 0x34,
    /** Load into the stack the element at the memory index.
     * Reads 4 consecutive bytes from the given index as a unsigned i64 [0, 18.446.744.073.709.551.615]:
     * `[ index, ..., index+7 ] -> i64`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(i64.load32_u [$memory])`
     * 
     * `[i32] --> [i64]`
     */
    i64_load32_u              = 0x35,
    /** Stores the value on the stack into the memory at the index on the stack.
     * Writes 4 consecutive bytes at the given index.
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `stack: [ $index, $value ]`
     * 
     * `(i32.store [$memory])`
     * 
     * `[i32, i32] --> []`
     */
    i32_store                 = 0x36,
    /** Stores the value on the stack into the memory at the index on the stack.
     * Writes 8 consecutive bytes at the given index.
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `stack: [ $index, $value ]`
     * 
     * `(i64.store [$memory])`
     * 
     * `[i32, i64] --> []`
     */
    i64_store                 = 0x37,
    /** Stores the value on the stack into the memory at the index on the stack.
     * Writes 4 consecutive bytes at the given index.
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `stack: [ $index, $value ]`
     * 
     * `(f32.store [$memory])`
     * 
     * `[i32, f32] --> []`
     */
    f32_store                 = 0x38,
    /** Stores the value on the stack into the memory at the index on the stack.
     * Writes 8 consecutive bytes at the given index.
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `stack: [ $index, $value ]`
     * 
     * `(f64.store [$memory])`
     * 
     * `[i32, f64] --> []`
     */
    f64_store                 = 0x39,
    /** Stores the value on the stack into the memory at the index on the stack.
     * Writes 1 byte (8 bits) at the given index.
     * The considered bits are the lowest of the number (0xff).
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `stack: [ $index, $value ]`
     * 
     * `(i32.store8 [$memory])`
     * 
     * `[i32, i32] --> []`
     */
    i32_store8                = 0x3a,
    /** Stores the value on the stack into the memory at the index on the stack.
     * Writes 2 consecutive bytes (16 bits) at the given index.
     * The considered bits are the lowest of the number (0xffff).
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `stack: [ $index, $value ]`
     * 
     * `(i32.store16 [$memory])`
     * 
     * `[i32, i32] --> []`
     */
    i32_store16               = 0x3b,
    /** Stores the value on the stack into the memory at the index on the stack.
     * Writes 1 byte (8 bits) at the given index.
     * The considered bits are the lowest of the number (0xff).
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `stack: [ $index, $value ]`
     * 
     * `(i64.store8 [$memory])`
     * 
     * `[i32, i64] --> []`
     */
    i64_store8                = 0x3c,
    /** Stores the value on the stack into the memory at the index on the stack.
     * Writes 2 consecutive bytes (16 bits) at the given index.
     * The considered bits are the lowest of the number (0xffff).
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `stack: [ $index, $value ]`
     * 
     * `(i64.store16 [$memory])`
     * 
     * `[i32, i64] --> []`
     */
    i64_store16               = 0x3d,
    /** Stores the value on the stack into the memory at the index on the stack.
     * Writes 4 consecutive bytes (32 bits) at the given index.
     * The considered bits are the lowest of the number (0xffffffff).
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `stack: [ $index, $value ]`
     * 
     * `(i64.store32 [$memory])`
     * 
     * `[i32, i64] --> []`
     */
    i64_store32               = 0x3e,
    /** Load into the stack the current memory size.
     * The memory size is intended as number of pages (1 page = 64 * 1024B = 64KB)
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(memory.size [$memory])`
     * 
     * `[] --> [i32]`
     */
    memory_size               = 0x3f,
    /** Try to grow the size of the memory.
     * Returns the precedent size into the stack, -1 if the operation fails (usually for memory limit reached).
     * The memory size is intended as number of pages (1 page = 64 * 1024B = 64KB)
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * `(memory.grow [$memory])`
     * 
     * `[i32] --> [i32]`
     */
    memory_grow               = 0x40,
    /** Load into the stack a constant as a i32
     * 
     * `(i32.const !i32_literal)`
     * 
     * `[] --> [i32]`
     */
    i32_const                 = 0x41,
    /** Load into the stack a constant as a i64
     * 
     * `(i64.const !i64_literal)`
     * 
     * `[] --> [i64]`
     */
    i64_const                 = 0x42,
    /** Load into the stack a constant as a f32
     * 
     * `(f32.const !f32_literal)`
     * 
     * `[] --> [f32]`
     */
    f32_const                 = 0x43,
    /** Load into the stack a constant as a f64
     * 
     * `(f64.const !f64_literal)`
     * 
     * `[] --> [f64]`
     */
    f64_const                 = 0x44,
    /** Check if the last element of the stack is equal to zero.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1] --> $1 == 0`
     * 
     * `(i32.eqz)`
     * 
     * `[i32] --> [i32]`
     */
    i32_eqz                   = 0x45,
    /** Check if the last two element of the stack are equal.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 == $2`
     * 
     * `(i32.eq)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_eq                    = 0x46,
    /** Check if the last two element of the stack are not equal.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 != $2`
     * 
     * `(i32.ne)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_ne                    = 0x47,
    /** Check if the second last element of the stack is
     * strictly lesser with respect to the last one.
     * The two elements are considered signed
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 < $2`
     * 
     * `(i32.lt_s)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_lt_s                  = 0x48,
    /** Check if the second last element of the stack is
     * strictly lesser with respect to the last one.
     * The two elements are considered unsigned
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 < $2`
     * 
     * `(i32.lt_u)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_lt_u                  = 0x49,
    /** Check if the second last element of the stack is
     * strictly greater with respect to the last one.
     * The two elements are considered signed
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 > $2`
     * 
     * `(i32.gt_s)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_gt_s                  = 0x4a,
    /** Check if the second last element of the stack is
     * strictly greater with respect to the last one.
     * The two elements are considered unsigned
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 > $2`
     * 
     * `(i32.gt_u)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_gt_u                  = 0x4b,
    /** Check if the second last element of the stack is
     * lesser or equall with respect to the last one.
     * The two elements are considered signed
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 <= $2`
     * 
     * `(i32.le_s)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_le_s                  = 0x4c,
    /** Check if the second last element of the stack is
     * lesser or equall with respect to the last one.
     * The two elements are considered unsigned
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 <= $2`
     * 
     * `(i32.le_u)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_le_u                  = 0x4d,
    /** Check if the second last element of the stack is
     * greater or equall with respect to the last one.
     * The two elements are considered signed
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 >= $2`
     * 
     * `(i32.ge_s)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_ge_s                  = 0x4e,
    /** Check if the second last element of the stack is
     * greater or equall with respect to the last one.
     * The two elements are considered unsigned
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 >= $2`
     * 
     * `(i32.ge_u)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_ge_u                  = 0x4f,
    /** Check if the last element of the stack is equal to zero.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1] --> $1 == 0`
     * 
     * `(i64.eqz)`
     * 
     * `[i64] --> [i32]`
     */
    i64_eqz                   = 0x50,
    /** Check if the last two element of the stack are equal.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 == $2`
     * 
     * `(i64.eq)`
     * 
     * `[i64, i64] --> [i32]`
     */
    i64_eq                    = 0x51,
    /** Check if the last two element of the stack are not equal.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 != $2`
     * 
     * `(i64.ne)`
     * 
     * `[i64, i64] --> [i32]`
     */
    i64_ne                    = 0x52,
    /** Check if the second last element of the stack is
     * strictly lesser with respect to the last one.
     * The two elements are considered signed
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 < $2`
     * 
     * `(i64.lt_s)`
     * 
     * `[i64, i64] --> [i32]`
     */
    i64_lt_s                  = 0x53,
    /** Check if the second last element of the stack is
     * strictly lesser with respect to the last one.
     * The two elements are considered unsigned
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 < $2`
     * 
     * `(i64.lt_u)`
     * 
     * `[i64, i64] --> [i32]`
     */
    i64_lt_u                  = 0x54,
    /** Check if the second last element of the stack is
     * strictly greater with respect to the last one.
     * The two elements are considered signed
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 > $2`
     * 
     * `(i64.gt_s)`
     * 
     * `[i64, i64] --> [i32]`
     */
    i64_gt_s                  = 0x55,
    /** Check if the second last element of the stack is
     * strictly greater with respect to the last one.
     * The two elements are considered unsigned
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 > $2`
     * 
     * `(i64.gt_u)`
     * 
     * `[i64, i64] --> [i32]`
     */
    i64_gt_u                  = 0x56,
    /** Check if the second last element of the stack is
     * lesser or equall with respect to the last one.
     * The two elements are considered signed
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 <= $2`
     * 
     * `(i64.le_s)`
     * 
     * `[i64, i64] --> [i32]`
     */
    i64_le_s                  = 0x57,
    /** Check if the second last element of the stack is
     * lesser or equall with respect to the last one.
     * The two elements are considered unsigned
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 <= $2`
     * 
     * `(i64.le_u)`
     * 
     * `[i64, i64] --> [i32]`
     */
    i64_le_u                  = 0x58,
    /** Check if the second last element of the stack is
     * greater or equall with respect to the last one.
     * The two elements are considered signed
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 >= $2`
     * 
     * `(i64.ge_s)`
     * 
     * `[i64, i64] --> [i32]`
     */
    i64_ge_s                  = 0x59,
    /** Check if the second last element of the stack is
     * greater or equall with respect to the last one.
     * The two elements are considered unsigned
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 >= $2`
     * 
     * `(i64.ge_u)`
     * 
     * `[i64, i64] --> [i32]`
     */
    i64_ge_u                  = 0x5a,
    /** Check if the last two element of the stack are equal.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 == $2`
     * 
     * `(f32.eq)`
     * 
     * `[f32, f32] --> [i32]`
     */
    f32_eq                    = 0x5b,
    /** Check if the last two element of the stack are not equal.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 != $2`
     * 
     * `(f32.ne)`
     * 
     * `[f32, f32] --> [i32]`
     */
    f32_ne                    = 0x5c,
    /** Check if the second last element of the stack is
     * strictly lesser with respect to the last one.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 < $2`
     * 
     * `(f32.lt)`
     * 
     * `[f32, f32] --> [i32]`
     */
    f32_lt                    = 0x5d,
    /** Check if the second last element of the stack is
     * strictly greater with respect to the last one.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 > $2`
     * 
     * `(f32.gt)`
     * 
     * `[f32, f32] --> [i32]`
     */
    f32_gt                    = 0x5e,
    /** Check if the second last element of the stack is
     * lesser or equal with respect to the last one.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 <= $2`
     * 
     * `(f32.le)`
     * 
     * `[f32, f32] --> [i32]`
     */
    f32_le                    = 0x5f,
    /** Check if the second last element of the stack is
     * greater or equal with respect to the last one.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 <= $2`
     * 
     * `(f32.ge)`
     * 
     * `[f32, f32] --> [i32]`
     */
    f32_ge                    = 0x60,
    /** Check if the last two element of the stack are equal.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 == $2`
     * 
     * `(f64.eq)`
     * 
     * `[f64, f64] --> [i32]`
     */
    f64_eq                    = 0x61,
    /** Check if the last two element of the stack are not equal.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 != $2`
     * 
     * `(f64.ne)`
     * 
     * `[f64, f64] --> [i32]`
     */
    f64_ne                    = 0x62,
    /** Check if the second last element of the stack is
     * strictly lesser with respect to the last one.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 < $2`
     * 
     * `(f64.lt)`
     * 
     * `[f64, f64] --> [i32]`
     */
    f64_lt                    = 0x63,
    /** Check if the second last element of the stack is
     * strictly greater with respect to the last one.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 > $2`
     * 
     * `(f64.gt)`
     * 
     * `[f64, f64] --> [i32]`
     */
    f64_gt                    = 0x64,
    /** Check if the second last element of the stack is
     * lesser or equal with respect to the last one.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 <= $2`
     * 
     * `(f64.le)`
     * 
     * `[f64, f64] --> [i32]`
     */
    f64_le                    = 0x65,
    /** Check if the second last element of the stack is
     * greater or equal with respect to the last one.
     * Returns a boolean (i32: 0 = false, 1 = true)
     * 
     * `stack: [$1, $2] --> $1 >= $2`
     * 
     * `(f64.le)`
     * 
     * `[f64, f64] --> [i32]`
     */
    f64_ge                    = 0x66,
    /** Counts the number of leading zeros in the
     * current bitstring number (Count Leading Zeros).
     * Examples: `0b00000001 = 2, 0b00010000 = 3`
     * 
     * `(i32.clz)`
     * 
     * `[i32] --> [i32]`
     */
    i32_clz                   = 0x67,
    /** Counts the number of trailing zeros in the
     * current bitstring number (Count Trailing Zeros)
     * Examples: `0b00000001 = 0, 0b00010000 = 4`
     * 
     * `(i32.ctz)`
     * 
     * `[i32] --> [i32]`
     */
    i32_ctz                   = 0x68,
    /** Counts the number of ones in the
     * current bitstring number
     * Examples: `0b00000001 = 1, 0b01010101 = 4`
     * 
     * `(i32.popcnt)`
     * 
     * `[i32] --> [i32]`
     */
    i32_popcnt                = 0x69,
    /** Binary addition
     * 
     * `stack: [$1, $2] --> $1 + $2`
     * 
     * `(i32.add)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_add                   = 0x6a,
    /** Binary subtraction
     * 
     * `stack: [$1, $2] --> $1 - $2`
     * 
     * `(i32.sub)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_sub                   = 0x6b,
    /** Binary multiplication
     * 
     * `stack: [$1, $2] --> $1 * $2`
     * 
     * `(i32.mul)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_mul                   = 0x6c,
    /** Binary division (signed operands)
     * 
     * `stack: [$1, $2] --> $1 / $2`
     * 
     * `(i32.div_s)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_div_s                 = 0x6d,
    
    /** Binary division (unsigned operands)
     * 
     * `stack: [$1, $2] --> $1 / $2`
     * 
     * `(i32.div_u)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_div_u                 = 0x6e,
    /** Binary remainder (signed operands)
     * 
     * `stack: [$1, $2] --> $1 % $2`
     * 
     * `(i32.rem_s)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_rem_s                 = 0x6f,
    /** Binary remainder (unsigned operands)
     * 
     * `stack: [$1, $2] --> $1 % $2`
     * 
     * `(i32.rem_u)`
     * 
     * `[i32, i32] --> [i32]`
     */
    i32_rem_u                 = 0x70,
    /** Binary and (bitwise - intended also as logical)
     * 
     * `stack: [$1, $2] --> $1 & $2`
     * 
     * `(i32.and)`
     * 
     * `[i32, i32] --> [i32]`
     * 
     */
    i32_and                   = 0x71,
    /** Binary or (bitwise - intended also as logical)
     * 
     * `stack: [$1, $2] --> $1 | $2`
     * 
     * `(i32.or)`
     * 
     * `[i32, i32] --> [i32]`
     * 
     */
    i32_or                    = 0x72,
    /** Binary xor (bitwise - intended also as logical)
     * 
     * `stack: [$1, $2] --> $1 ^ $2`
     * 
     * `(i32.xor)`
     * 
     * `[i32, i32] --> [i32]`
     * 
     */
    i32_xor                   = 0x73,
    /** Binary bit-shift left (bitwise)
     * 
     * `stack: [$1, $2] --> $1 << $2`
     * 
     * `(i32.shl)`
     * 
     * `[i32, i32] --> [i32]`
     * 
     */
    i32_shl                   = 0x74,
    /** Binary bit-shift right (bitwise - signed operand)
     * 
     * `stack: [$1, $2] --> $1 >> $2`
     * 
     * `(i32.shr_s)`
     * 
     * `[i32, i32] --> [i32]`
     * 
     */
    i32_shr_s                 = 0x75,
    /** Binary bit-shift right (bitwise - unsigned operand)
     * 
     * `stack: [$1, $2] --> $1 >> $2`
     * 
     * `(i32.shr_u)`
     * 
     * `[i32, i32] --> [i32]`
     * 
     */
    i32_shr_u                 = 0x76,
    /** Binary bit-rotation left (bitwise)
     * 
     * `stack: [$1, $2] --> $1 rot_l $2`
     * 
     * `(i32.rotl)`
     * 
     * `[i32, i32] --> [i32]`
     * 
     */
    i32_rotl                  = 0x77,
    /** Binary bit-rotation right (bitwise)
     * 
     * `stack: [$1, $2] --> $1 rot_r $2`
     * 
     * `(i32.rotr)`
     * 
     * `[i32, i32] --> [i32]`
     * 
     */
    i32_rotr                  = 0x78,
    /** Counts the number of leading zeros in the
     * current bitstring number (Count Leading Zeros).
     * Examples: `0b00000001 = 2, 0b00010000 = 3`
     * 
     * `(i64.clz)`
     * 
     * `[i64] --> [i64]`
     */
    i64_clz                   = 0x79,
    /** Counts the number of trailing zeros in the
     * current bitstring number (Count Trailing Zeros)
     * Examples: `0b00000001 = 0, 0b00010000 = 4`
     * 
     * `(i64.ctz)`
     * 
     * `[i64] --> [i64]`
     */
    i64_ctz                   = 0x7a,
    /** Counts the number of ones in the
     * current bitstring number
     * Examples: `0b00000001 = 1, 0b01010101 = 4`
     * 
     * `(i64.popcnt)`
     * 
     * `[i64] --> [i64]`
     */
    i64_popcnt                = 0x7b,
    /** Binary addition
     * 
     * `stack: [$1, $2] --> $1 + $2`
     * 
     * `(i64.add)`
     * 
     * `[i64, i64] --> [i64]`
     */
    i64_add                   = 0x7c,
    /** Binary subtraction
     * 
     * `stack: [$1, $2] --> $1 - $2`
     * 
     * `(i64.sub)`
     * 
     * `[i64, i64] --> [i64]`
     */
    i64_sub                   = 0x7d,
    /** Binary multiplication
     * 
     * `stack: [$1, $2] --> $1 * $2`
     * 
     * `(i64.mul)`
     * 
     * `[i64, i64] --> [i64]`
     */
    i64_mul                   = 0x7e,
    /** Binary division (signed operands)
     * 
     * `stack: [$1, $2] --> $1 / $2`
     * 
     * `(i64.div_s)`
     * 
     * `[i64, i64] --> [i64]`
     */
    i64_div_s                 = 0x7f,
    /** Binary division (unsigned operands)
     * 
     * `stack: [$1, $2] --> $1 / $2`
     * 
     * `(i64.div_u)`
     * 
     * `[i64, i64] --> [i64]`
     */
    i64_div_u                 = 0x80,
    /** Binary remainder (signed operands)
     * 
     * `stack: [$1, $2] --> $1 % $2`
     * 
     * `(i64.rem_s)`
     * 
     * `[i64, i64] --> [i64]`
     */
    i64_rem_s                 = 0x81,
    /** Binary remainder (unsigned operands)
     * 
     * `stack: [$1, $2] --> $1 % $2`
     * 
     * `(i64.rem_u)`
     * 
     * `[i64, i64] --> [i64]`
     */
    i64_rem_u                 = 0x82,
    /** Binary and (bitwise - intended also as logical)
     * 
     * `stack: [$1, $2] --> $1 & $2`
     * 
     * `(i64.and)`
     * 
     * `[i64, i64] --> [i64]`
     */
    i64_and                   = 0x83,
    /** Binary or (bitwise - intended also as logical)
     * 
     * `stack: [$1, $2] --> $1 | $2`
     * 
     * `(i64.or)`
     * 
     * `[i64, i64] --> [i64]`
     * 
     */
    i64_or                    = 0x84,
    /** Binary xor (bitwise - intended also as logical)
     * 
     * `stack: [$1, $2] --> $1 ^ $2`
     * 
     * `(i64.xor)`
     * 
     * `[i64, i64] --> [i64]`
     * 
     */
    i64_xor                   = 0x85,
    /** Binary bit-shift left (bitwise)
     * 
     * `stack: [$1, $2] --> $1 << $2`
     * 
     * `(i64.shl)`
     * 
     * `[i64, i64] --> [i64]`
     */
    i64_shl                   = 0x86,
    /** Binary bit-shift right (bitwise - signed operand)
     * 
     * `stack: [$1, $2] --> $1 >> $2`
     * 
     * `(i64.shr_s)`
     * 
     * `[i64, i64] --> [i64]`
     */
    i64_shr_s                 = 0x87,
    /** Binary bit-shift right (bitwise - unsigned operand)
     * 
     * `stack: [$1, $2] --> $1 >> $2`
     * 
     * `(i64.shr_u)`
     * 
     * `[i64, i64] --> [i64]`
     */
    i64_shr_u                 = 0x88,
    /** Binary bit-rotation left (bitwise)
     * 
     * `stack: [$1, $2] --> $1 rot_l $2`
     * 
     * `(i64.rotl)`
     * 
     * `[i64, i64] --> [i64]`
     */
    i64_rotl                  = 0x89,
    /** Binary bit-rotation right (bitwise)
     * 
     * `stack: [$1, $2] --> $1 rot_r $2`
     * 
     * `(i64.rotr)`
     * 
     * `[i64, i64] --> [i64]`
     */
    i64_rotr                  = 0x8a,
    /** Unary modulo (absolute value)
     * 
     * `stack: [$1] --> |$1|`
     * 
     * `(f32.abs)`
     * 
     * `[f32] --> [f32]`
    */
    f32_abs                   = 0x8b,
    /** Unary negative
     * 
     * `stack: [$1] --> -$1`
     * 
     * `(f32.neg)`
     * 
     * `[f32] --> [f32]`
    */
    f32_neg                   = 0x8c,
    /** Unary ceilling
     * 
     * `stack: [$1] --> ceil($1)`
     * 
     * `(f32.ceil)`
     * 
     * `[f32] --> [f32]`
    */
    f32_ceil                  = 0x8d,
    /** Unary flooring
     * 
     * `stack: [$1] --> flor($1)`
     * 
     * `(f32.floor)`
     * 
     * `[f32] --> [f32]`
    */
    f32_floor                 = 0x8e,
    /** Unary truncation.
     * Example: 1.9 => 1.0
     * 
     * `stack: [$1] --> trunc($1)`
     * 
     * `(f32.trunc)`
     * 
     * `[f32] --> [f32]`
    */
    f32_trunc                 = 0x8f,
    /** Unary nearest.
     * Example: 1.1 => 1.0; 1.6 => 2.0
     * 
     * `stack: [$1] --> round($1)`
     * 
     * `(f32.nearest)`
     * 
     * `[f32] --> [f32]`
    */
    f32_nearest               = 0x90,
    /** Unary square root
     * 
     * `stack: [$1] --> sqrt($1)`
     * 
     * `(f32.sqrt)`
     * 
     * `[f32] --> [f32]`
    */
    f32_sqrt                  = 0x91,
    /** Binary addition
     * 
     * `stack: [$1, $2] --> $1 + $2`
     * 
     * `(f32.add)`
     * 
     * `[f32, f32] --> [f32]`
    */
    f32_add                   = 0x92,
    /** Binary subtraction
     * 
     * `stack: [$1, $2] --> $1 - $2`
     * 
     * `(f32.sub)`
     * 
     * `[f32, f32] --> [f32]`
    */
    f32_sub                   = 0x93,
    /** Binary multiplication
     * 
     * `stack: [$1, $2] --> $1 * $2`
     * 
     * `(f32.mul)`
     * 
     * `[f32, f32] --> [f32]`
    */
    f32_mul                   = 0x94,
    /** Binary division
     * 
     * `stack: [$1, $2] --> $1 / $2`
     * 
     * `(f32.div)`
     * 
     * `[f32, f32] --> [f32]`
    */
    f32_div                   = 0x95,
    /** Binary min
     * 
     * `stack: [$1, $2] --> min($1, $2)`
     * 
     * `(f32.min)`
     * 
     * `[f32, f32] --> [f32]`
    */
    f32_min                   = 0x96,
    /** Binary max
     * 
     * `stack: [$1, $2] --> max($1, $2)`
     * 
     * `(f32.max)`
     * 
     * `[f32, f32] --> [f32]`
    */
    f32_max                   = 0x97,
    /** Binary same-sign check
     * 
     * `stack: [$1, $2] --> sign($1) == sign($2)`
     * 
     * `(f32.copysign)`
     * 
     * `[f32, f32] --> [f32]`
    */
    f32_copysign              = 0x98,
    /** Unary modulo (absolute value)
     * 
     * `stack: [$1] --> |$1|`
     * 
     * `(f64.abs)`
     * 
     * `[f64] --> [f64]`
    */
    f64_abs                   = 0x99,
    /** Unary negative
     * 
     * `stack: [$1] --> -$1`
     * 
     * `(f64.neg)`
     * 
     * `[f64] --> [f64]`
    */
    f64_neg                   = 0x9a,
    /** Unary ceilling
     * 
     * `stack: [$1] --> ceil($1)`
     * 
     * `(f64.ceil)`
     * 
     * `[f64] --> [f64]`
    */
    f64_ceil                  = 0x9b,
    /** Unary flooring
     * 
     * `stack: [$1] --> flor($1)`
     * 
     * `(f64.floor)`
     * 
     * `[f64] --> [f64]`
    */
    f64_floor                 = 0x9c,
    /** Unary truncation.
     * Example: 1.9 => 1.0
     * 
     * `stack: [$1] --> trunc($1)`
     * 
     * `(f64.trunc)`
     * 
     * `[f64] --> [f64]`
    */
    f64_trunc                 = 0x9d,
    /** Unary nearest.
     * Example: 1.1 => 1.0; 1.6 => 2.0
     * 
     * `stack: [$1] --> round($1)`
     * 
     * `(f64.nearest)`
     * 
     * `[f64] --> [f64]`
    */
    f64_nearest               = 0x9e,
    /** Unary square root
     * 
     * `stack: [$1] --> sqrt($1)`
     * 
     * `(f64.sqrt)`
     * 
     * `[f64] --> [f64]`
    */
    f64_sqrt                  = 0x9f,
    /** Binary addition
     * 
     * `stack: [$1, $2] --> $1 + $2`
     * 
     * `(f64.add)`
     * 
     * `[f64, f64] --> [f64]`
    */
    f64_add                   = 0xa0,
    /** Binary subtraction
     * 
     * `stack: [$1, $2] --> $1 - $2`
     * 
     * `(f64.sub)`
     * 
     * `[f64, f64] --> [f64]`
    */
    f64_sub                   = 0xa1,
    /** Binary multiplication
     * 
     * `stack: [$1, $2] --> $1 * $2`
     * 
     * `(f64.mul)`
     * 
     * `[f64, f64] --> [f64]`
    */
    f64_mul                   = 0xa2,
    /** Binary division
     * 
     * `stack: [$1, $2] --> $1 / $2`
     * 
     * `(f64.div)`
     * 
     * `[f64, f64] --> [f64]`
    */
    f64_div                   = 0xa3,
    /** Binary min
     * 
     * `stack: [$1, $2] --> min($1, $2)`
     * 
     * `(f64.min)`
     * 
     * `[f64, f64] --> [f64]`
    */
    f64_min                   = 0xa4,
    /** Binary max
     * 
     * `stack: [$1, $2] --> max($1, $2)`
     * 
     * `(f64.max)`
     * 
     * `[f64, f64] --> [f64]`
    */
    f64_max                   = 0xa5,
    /** Binary same-sign check
     * 
     * `stack: [$1, $2] --> sign($1) == sign($2)`
     * 
     * `(f64.copysign)`
     * 
     * `[f64, f64] --> [f64]`
    */
    f64_copysign              = 0xa6,
    /** Wrap a i64 to a i32 (modulo 2^32)
     * 
     * `(i32.wrap_i64)`
     * 
     * `[i64] --> [i32]`
     */
    i32_wrap_i64              = 0xa7,
    /** Truncate a f32 to a signed i32
     * 
     * `(i32.trunc_f32_s)`
     * 
     * `[f32] --> [i32]`
     */
    i32_trunc_f32_s           = 0xa8,
    /** Truncate a f32 to a unsigned i32
     * 
     * `(i32.trunc_f32_u)`
     * 
     * `[f32] --> [i32]`
     */
    i32_trunc_f32_u           = 0xa9,
    /** Truncate a f64 to a signed i32
     * 
     * `(i32.trunc_f64_s)`
     * 
     * `[f64] --> [i32]`
     */
    i32_trunc_f64_s           = 0xaa,
    /** Truncate a f64 to a unsigned i32
     * 
     * `(i32.trunc_f64_u)`
     * 
     * `[f64] --> [i32]`
     */
    i32_trunc_f64_u           = 0xab,
    /** Extend a signed i32 to a i64
     * 
     * `(i64.extend_i32_s)`
     * 
     * `[i32] --> [i64]`
     */
    i64_extend_i32_s          = 0xac,
    /** Extend a unsigned i32 to a i64
     * 
     * `(i64.extend_i32_u)`
     * 
     * `[i32] --> [i64]`
     */
    i64_extend_i32_u          = 0xad,
    /** Truncate a f32 to a signed i64
     * 
     * `(i64.trunc_f32_s)`
     * 
     * `[f32] --> [i64]`
     */
    i64_trunc_f32_s           = 0xae,
    /** Truncate a f32 to a unsigned i64
     * 
     * `(i64.trunc_f32_u)`
     * 
     * `[f32] --> [i64]`
     */
    i64_trunc_f32_u           = 0xaf,
    /** Truncate a f64 to a signed i64
     * 
     * `(i64.trunc_f64_s)`
     * 
     * `[f64] --> [i64]`
     */
    i64_trunc_f64_s           = 0xb0,
    /** Truncate a f64 to a unsigned i64
     * 
     * `(i64.trunc_f64_u)`
     * 
     * `[f64] --> [i64]`
     */
    i64_trunc_f64_u           = 0xb1,
    /** Convert a signed i32 to a f32
     * 
     * `(f32.convert_i32_s)`
     * 
     * `[i32] --> [f32]`
     */
    f32_convert_i32_s         = 0xb2,
    /** Convert a unsigned i32 to a f32
     * 
     * `(f32.convert_i32_u)`
     * 
     * `[i32] --> [f32]`
     */
    f32_convert_i32_u         = 0xb3,
    /** Convert a signed i64 to a f32
     * 
     * `(f32.convert_i64_s)`
     * 
     * `[i64] --> [f32]`
     */
    f32_convert_i64_s         = 0xb4,
    /** Convert a unsigned i64 to a f32
     * 
     * `(f32.convert_i64_u)`
     * 
     * `[i64] --> [f32]`
     */
    f32_convert_i64_u         = 0xb5,
    /** Demote a f64 to a f32 (loosing precision)
     * 
     * `(f32.ddemote_f64)`
     * 
     * `[f64] --> [f32]`
     */
    f32_demote_f64            = 0xb6,
    /** Convert a signed i32 to a f64
     * 
     * `(f64.convert_i32_s)`
     * 
     * `[i32] --> [f64]`
     */
    f64_convert_i32_s         = 0xb7,
    /** Convert a unsigned i32 to a f64
     * 
     * `(f64.convert_i32_u)`
     * 
     * `[i32] --> [f64]`
     */
    f64_convert_i32_u         = 0xb8,
    /** Convert a signed i64 to a f64
     * 
     * `(f64.convert_i64_u)`
     * 
     * `[i64] --> [f64]`
     */
    f64_convert_i64_s         = 0xb9,
    /** Convert a unsigned i64 to a f64
     * 
     * `(f64.convert_i64_u)`
     * 
     * `[i64] --> [f64]`
     */
    f64_convert_i64_u         = 0xba,
    /** Promote a f32 to a f64 (increasing precision)
     * 
     * `(f64.promote_f32)`
     * 
     * `[f32] --> [f64]`
     */
    f64_promote_f32           = 0xbb,
    /** Reinterpret bits of a f32 as a i32
     * 
     * `(i32.reinterpret_f32)`
     * 
     * `[f32] --> [i32]`
     */
    i32_reinterpret_f32       = 0xbc,
    /** Reinterpret bits of a f64 as a i64
     * 
     * `(i64.reinterpret_f64)`
     * 
     * `[f64] --> [i64]`
     */
    i64_reinterpret_f64       = 0xbd,
    /** Reinterpret bits of a i32 as a f32
     * 
     * `(f32.reinterpret_i32)`
     * 
     * `[i32] --> [f32]`
     */
    f32_reinterpret_i32       = 0xbe,
    /** Reinterpret bits of a i64 as a f64
     * 
     * `(f64.reinterpret_i64)`
     * 
     * `[i64] --> [f64]`
     */
    f64_reinterpret_i64       = 0xbf,
    /** Threat an i32 as a signed i8 and extends again to i32,
     * propagating the sign bit to the new bit-length.
     * Only low bits are considered (0xff)
     * 
     * `(i32.extend8_s)`
     * 
     * `[i32] --> [i32]`
     */
    i32_extend8_s             = 0xc0,
    /** Threat an i32 as a signed i16 and extends again to i32,
     * propagating the sign bit to the new bit-length.
     * Only low bits are considered (0xffff)
     * 
     * `(i32.extend16_s)`
     * 
     * `[i32] --> [i32]`
     */
    i32_extend16_s            = 0xc1,
    /** Threat an i64 as a signed i8 and extends again to i64,
     * propagating the sign bit to the new bit-length.
     * Only low bits are considered (0xff)
     * 
     * `(i64.extend8_s)`
     * 
     * `[i64] --> [i64]`
     */
    i64_extend8_s             = 0xc2,
    /** Threat an i64 as a signed i16 and extends again to i64,
     * propagating the sign bit to the new bit-length.
     * Only low bits are considered (0xffff)
     * 
     * `(i64.extend16_s)`
     * 
     * `[i64] --> [i64]`
     */
    i64_extend16_s            = 0xc3,
    /** Threat an i64 as a signed i32 and extends again to i64,
     * propagating the sign bit to the new bit-length.
     * Only low bits are considered (0xffffffff)
     * 
     * `(i64.extend32_s)`
     * 
     * `[i64] --> [i64]`
     */
    i64_extend32_s            = 0xc4,
    /** Push a null value into the stack
     * 
     * `(ref.null (type $refType))`
     * 
     * `[] --> [t]`
     */
    ref_null                  = 0xd0,
    /** Check if the last element of the stack is a null reference.
    * Returns a boolean (i32: 0 = false, 1 = true)
    * 
    * `stack: [$1] --> $1 == null`
    * 
    * `(ref.is_null)`
    * 
    * `[t] --> [i32]`
    */
    ref_is_null               = 0xd1,
    /** Push in the stack the pointer to a given function
     * 
     * `(ref.func $function)`
     * 
     * `[] --> [funcref]`
     */
    ref_func                  = 0xd2,

    /** Extend the instruction to a more advanced one.
     * Look the next byte to discriminate the instruction
     * (binary format only).
     * @see {@link OpCodesExt1}
     */
    op_extension_1             = 0xfc,
    /** Extend the instruction to a more advanced one.
     * Look the next byte to discriminate the instruction
     * (binary format only).
     * @see {@link OpCodesExt2}
     */
     op_extension_2             = 0xfd
}

/** Extension enumeration of all available non-reserved
 * advanced instructions for WebAssembly v1
 */
export enum OpCodesExt1 {
    /** Truncate with saturation a f32 to a signed i32.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i32 value on negative/positive overflow
     * - NaN is converted to 0
     * 
     * `(i32.i32_trunc_sat_f32_s)`
     * 
     * `[f32] --> [i32]`
     * 
     * @see {@link OpCodes.i32_trunc_f32_s}
     */
    i32_trunc_sat_f32_s       = 0x00,
    /** Truncate with saturation a f32 to a unsigned i32.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i32 value on negative/positive overflow
     * - NaN is converted to 0
     * 
     * `(i32.i32_trunc_sat_f32_u)`
     * 
     * `[f32] --> [i32]`
     * 
     * @see {@link OpCodes.i32_trunc_f32_u}
     */
    i32_trunc_sat_f32_u       = 0x01,
    /** Truncate with saturation a f64 to a signed i32.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i32 value on negative/positive overflow
     * - NaN is converted to 0
     * 
     * `(i32.i32_trunc_sat_f64_s)`
     * 
     * `[f64] --> [i32]`
     * 
     * @see {@link OpCodes.i32_trunc_f64_s}
     */
    i32_trunc_sat_f64_s       = 0x02,
    /** Truncate with saturation a f64 to a unsigned i32.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i32 value on negative/positive overflow
     * - NaN is converted to 0
     * 
     * `(i32.i32_trunc_sat_f64_u)`
     * 
     * `[f64] --> [i32]`
     * 
     * @see {@link OpCodes.i32_trunc_f64_u}
     */
    i32_trunc_sat_f64_u       = 0x03,
    /** Truncate with saturation a f32 to a signed i64.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i64 value on negative/positive overflow
     * - NaN is converted to 0
     * 
     * `(i64.i64_trunc_sat_f32_s)`
     * 
     * `[f32] --> [i64]`
     * 
     * @see {@link OpCodes.i64_trunc_f32_s}
     */
    i64_trunc_sat_f32_s       = 0x04,
    /** Truncate with saturation a f32 to a unsigned i64.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i64 value on negative/positive overflow
     * - NaN is converted to 0
     * 
     * `(i64.i64_trunc_sat_f32_u)`
     * 
     * `[f32] --> [i64]`
     * 
     * @see {@link OpCodes.i64_trunc_f32_u}
     */
    i64_trunc_sat_f32_u       = 0x05,
    /** Truncate with saturation a f64 to a signed i64.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i64 value on negative/positive overflow
     * - NaN is converted to 0
     * 
     * `(i64.i64_trunc_sat_f64_s)`
     * 
     * `[f64] --> [i64]`
     * 
     * @see {@link OpCodes.i64_trunc_f64_s}
     */
    i64_trunc_sat_f64_s       = 0x06,
    /** Truncate with saturation a f64 to a unsigned i64.
     * 
     * Saturation:
     * - prevents trap errors from the conversion
     * - return min/max i64 value on negative/positive overflow
     * - NaN is converted to 0
     * 
     * `(i64.i64_trunc_sat_f64_u)`
     * 
     * `[f64] --> [i64]`
     * 
     * @see {@link OpCodes.i64_trunc_f64_u}
     */
    i64_trunc_sat_f64_u       = 0x07,
    /** Copy data from a passive data segment into a memory.
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * ### #Bulk Memory
     * 
     * `stack: [$dstAddress, $srcOffset, $sizeBytes] --> []`
     * 
     * `(memory.init [$memory])`
     * 
     * `[i32, i32, i32] --> []`
     */
    memory_init               = 0x08,
    /** Shrink the size of a data segment to zero.
     * The data section is still referenceable but any access
     * will cause a trap (runtime error - beside zero-length accesses)
     * 
     * ### #Bulk Memory
     * 
     * `(data.drop $data)`
     * 
     * `[] --> []`
     */
    data_drop                 = 0x09,
    /** Copy data from a source memory region to a destination region.
     * The regions can also overlap. The source and destination memory can be the same.
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1).
     * 
     * ### #Bulk Memory
     * 
     * `stack: [$dstAddress, $srcAddress, $regionSizeBytes] --> []`
     * 
     * `(memory.copy [$srcMemory] [$dstMemory])`
     * 
     * `[i32, i32, i32] --> []`
     */
    memory_copy               = 0x0a,
    /** Fill the given region of a memory with the value present into the stack.
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1).
     * 
     * ### #Bulk Memory
     * 
     * `stack: [$dstAddress, $value, $sizeBytes] --> []`
     * 
     * `(memory.fill [$memory])`
     * 
     * `[i32, i32, i32] --> []`
     */
    memory_fill               = 0x0b,
    /** Copy data from a passive data segment into a table.
     * (assumes table 0 if omitted since there should be only one table in WASM-v1)
     * 
     * ### #Bulk Memory
     * 
     * `stack: [$dstAddress, $srcOffset, $sizeBytes] --> []`
     * 
     * `(table.init [$table])`
     * 
     * `[i32, i32, i32] --> []`
     */
    table_init                = 0x0c,
    /** Discard the data in an element segment.
     * (assumes table 0 if omitted since there should be only one table in WASM-v1)
     * 
     * ### #Bulk Memory
     * 
     * `(elem.drop $index [$table])`
     * 
     * `[] --> []`
     */
    elem_drop                 = 0x0d,
    /** Copy data from a source table region to a destination region.
     * The regions can also overlap. The source and destination tables can be the same.
     * (assumes table 0 if omitted since there should be only one table in WASM-v1)
     * 
     * ### #Bulk Memory
     * 
     * `stack: [$dstIndex, $srcIndex, $indexSize] --> []`
     * 
     * `(table.copy [$srcTable] [$dstTable])`
     * 
     * `[i32, i32, i32] --> []`
     */
    table_copy                = 0x0e,
    /** Try to grow the size of the table.
     * Returns the precedent size into the stack, -1 if the operation fails (usually for memory limit reached).
     * The table size is intended as number of elements
     * (assumes table 0 if omitted since there should be only one table in WASM-v1)
     * 
     * `(table.grow [$table])`
     * 
     * `[t, i32] --> [i32]`
     */
    table_grow                = 0x0f,
    /** Load into the stack the current table size.
     * The table size is intended as number of elements
     * (assumes table 0 if omitted since there should be only one table in WASM-v1)
     * 
     * `(table.size [$table])`
     * 
     * `[] --> [i32]`
     */
    table_size                = 0x10,
    /** Fill the given region of a table with the value present into the stack.
     * (assumes table 0 if omitted since there should be only one table in WASM-v1).
     * 
     * `stack: [$dstAddress, $value, $sizeIndex] --> []`
     * 
     * `(table.fill [$table])`
     * 
     * `[i32, t, i32] --> []`
     */
    table_fill                = 0x11
}

/** Extension enumeration of all available non-reserved
 * advanced instructions for WebAssembly v1
 */
export enum OpCodesExt2 {
    /** Load into the stack the element at the memory index.
     * Reads 16 consecutives bytes from the given index as a v128:
     * `[ index, ..., index+15 ] -> v128`
     * (assumes memory 0 if omitted since there should be only one memory in WASM-v1)
     * 
     * ### #SIMD instruction
     * 
     * `(v128.load [$memory])`
     * 
     * `[i32] --> [v128]`
     */
    v128_load                           = 0x00,
    /** `[i32] --> [v128]` */
    v128_load8x8_s                      = 0x01,
    /** `[i32] --> [v128]` */
    v128_load8x8_u                      = 0x02,
    /** `[i32] --> [v128]` */
    v128_load16x4_s                     = 0x03,
    /** `[i32] --> [v128]` */
    v128_load16x4_u                     = 0x04,
    /** `[i32] --> [v128]` */
    v128_load32x2_s                     = 0x05,
    /** `[i32] --> [v128]` */
    v128_load32x2_u                     = 0x06,
    /** `[i32] --> [v128]` */
    v128_load_splat_1                   = 0x07,
    /** `[i32] --> [v128]` */
    v128_load_splat_2                   = 0x08,
    /** `[i32] --> [v128]` */
    v128_load_splat_3                   = 0x09,
    /** `[i32] --> [v128]` */
    v128_load_splat_4                   = 0x0a,
    /** `[i32, v128] --> []` */
    v128_store                          = 0x0b,
    /** `[] --> [v128]` */
    v128_const                          = 0x0c,
    /** `[v128, v128] --> [v128]` */
    i8x16_shuffle                       = 0x0d,
    /** `[v128, v128] --> [v128]` */
    i8x16_swizzle                       = 0x0e,
    /** `[i32] --> [v128]` */
    i8x16_splat                         = 0x0f,
    /** `[i32] --> [v128]` */
    i16x8_splat                         = 0x10,
    /** `[i32] --> [v128]` */
    i32x4_splat                         = 0x11,
    /** `[i64] --> [v128]` */
    i64x2_splat                         = 0x12,
    /** `[f32] --> [v128]` */
    f32x4_splat                         = 0x13,
    /** `[f64] --> [v128]` */
    f64x2_splat                         = 0x14,
    /** `[v128] --> [i32]` */
    i8x16_extract_lane_s                = 0x15,
    /** `[v128] --> [i32]` */
    i8x16_extract_lane_u                = 0x16,
    /** `[v128, i32] --> [v128]` */
    i8x16_replace_lane                  = 0x17,
    /** `[v128] --> [i32]` */
    i16x8_extract_lane_s                = 0x18,
    /** `[v128] --> [i32]` */
    i16x8_extract_lane_u                = 0x19,
    /** `[v128, i32] --> [v128]` */
    i16x8_replace_lane                  = 0x1a,
    /** `[v128] --> [i32]` */
    i32x4_extract_lane                  = 0x1b,
    /** `[v128, i32] --> [v128]` */
    i32x4_replace_lane                  = 0x1c,
    /** `[v128] --> [i64]` */
    i64x2_extract_lane                  = 0x1d,
    /** `[v128, i64] --> [v128]` */
    i64x2_replace_lane                  = 0x1e,
    /** `[v128] --> [f32]` */
    f32x4_extract_lane                  = 0x1f,
    /** `[v128, f32] --> [v128]` */
    f32x4_replace_lane                  = 0x20,
    /** `[v128] --> [f64]` */
    f64x2_extract_lane                  = 0x21,
    /** `[v128, f64] --> [v128]` */
    f64x2_replace_lane                  = 0x22,
    /** `[v128, v128] --> [v128]` */
    i8x16_eq                            = 0x23,
    /** `[v128, v128] --> [v128]` */
    i8x16_ne                            = 0x24,
    /** `[v128, v128] --> [v128]` */
    i8x16_lt_s                          = 0x25,
    /** `[v128, v128] --> [v128]` */
    i8x16_lt_u                          = 0x26,
    /** `[v128, v128] --> [v128]` */
    i8x16_gt_s                          = 0x27,
    /** `[v128, v128] --> [v128]` */
    i8x16_gt_u                          = 0x28,
    /** `[v128, v128] --> [v128]` */
    i8x16_le_s                          = 0x29,
    /** `[v128, v128] --> [v128]` */
    i8x16_le_u                          = 0x2a,
    /** `[v128, v128] --> [v128]` */
    i8x16_ge_s                          = 0x2b,
    /** `[v128, v128] --> [v128]` */
    i8x16_ge_u                          = 0x2c,
    /** `[v128, v128] --> [v128]` */
    i16x8_eq                            = 0x2d,
    /** `[v128, v128] --> [v128]` */
    i16x8_ne                            = 0x2e,
    /** `[v128, v128] --> [v128]` */
    i16x8_lt_s                          = 0x2f,
    /** `[v128, v128] --> [v128]` */
    i16x8_lt_u                          = 0x30,
    /** `[v128, v128] --> [v128]` */
    i16x8_gt_s                          = 0x31,
    /** `[v128, v128] --> [v128]` */
    i16x8_gt_u                          = 0x32,
    /** `[v128, v128] --> [v128]` */
    i16x8_le_s                          = 0x33,
    /** `[v128, v128] --> [v128]` */
    i16x8_le_u                          = 0x34,
    /** `[v128, v128] --> [v128]` */
    i16x8_ge_s                          = 0x35,
    /** `[v128, v128] --> [v128]` */
    i16x8_ge_u                          = 0x36,
    /** `[v128, v128] --> [v128]` */
    i32x4_eq                            = 0x37,
    /** `[v128, v128] --> [v128]` */
    i32x4_ne                            = 0x38,
    /** `[v128, v128] --> [v128]` */
    i32x4_lt_s                          = 0x39,
    /** `[v128, v128] --> [v128]` */
    i32x4_lt_u                          = 0x3a,
    /** `[v128, v128] --> [v128]` */
    i32x4_gt_s                          = 0x3b,
    /** `[v128, v128] --> [v128]` */
    i32x4_gt_u                          = 0x3c,
    /** `[v128, v128] --> [v128]` */
    i32x4_le_s                          = 0x3d,
    /** `[v128, v128] --> [v128]` */
    i32x4_le_u                          = 0x3e,
    /** `[v128, v128] --> [v128]` */
    i32x4_ge_s                          = 0x3f,
    /** `[v128, v128] --> [v128]` */
    i32x4_ge_u                          = 0x40,
    /** `[v128, v128] --> [v128]` */
    f32x4_eq                            = 0x41,
    /** `[v128, v128] --> [v128]` */
    f32x4_ne                            = 0x42,
    /** `[v128, v128] --> [v128]` */
    f32x4_lt                            = 0x43,
    /** `[v128, v128] --> [v128]` */
    f32x4_gt                            = 0x44,
    /** `[v128, v128] --> [v128]` */
    f32x4_le                            = 0x45,
    /** `[v128, v128] --> [v128]` */
    f32x4_ge                            = 0x46,
    /** `[v128, v128] --> [v128]` */
    f64x2_eq                            = 0x47,
    /** `[v128, v128] --> [v128]` */
    f64x2_ne                            = 0x48,
    /** `[v128, v128] --> [v128]` */
    f64x2_lt                            = 0x49,
    /** `[v128, v128] --> [v128]` */
    f64x2_gt                            = 0x4a,
    /** `[v128, v128] --> [v128]` */
    f64x2_le                            = 0x4b,
    /** `[v128, v128] --> [v128]` */
    f64x2_ge                            = 0x4c,
    /** `[v128] --> [v128]` */
    /** `[v128, v128] --> [v128]` */
    v128_not                            = 0x4d,
    /** `[v128, v128] --> [v128]` */
    v128_and                            = 0x4e,
    /** `[v128, v128] --> [v128]` */
    v128_andnot                         = 0x4f,
    /** `[v128, v128] --> [v128]` */
    v128_or                             = 0x50,
    /** `[v128, v128] --> [v128]` */
    v128_xor                            = 0x51,
    /** `[v128, v128, v128] --> [v128]` */
    v128_bitselect                      = 0x52,
    /** `[v128] --> [i32]` */
    v128_any_true                       = 0x53,
    /** `[i32, v128] --> [v128]` */
    v128_load8_lane                     = 0x54,
    /** `[i32, v128] --> [v128]` */
    v128_load16_lane                    = 0x55,
    /** `[i32, v128] --> [v128]` */
    v128_load32_lane                    = 0x56,
    /** `[i32, v128] --> [v128]` */
    v128_load64_lane                    = 0x57,
    /** `[i32, v128] --> [v128]` */
    v128_store8_lane                    = 0x58,
    /** `[i32, v128] --> [v128]` */
    v128_store16_lane                   = 0x59,
    /** `[i32, v128] --> [v128]` */
    v128_store32_lane                   = 0x5a,
    /** `[i32, v128] --> [v128]` */
    v128_store64_lane                   = 0x5b,
    /** `[i32] --> [v128]` */
    v128_load32_zero                    = 0x5c,
    /** `[i32] --> [v128]` */
    v128_load64_zero                    = 0x5d,
    /** `[v128] --> [v128]` */
    f32x4_demote_f64x2_zero             = 0x5e,
    /** `[v128] --> [v128]` */
    f64x2_promote_low_f32x4             = 0x5f,
    /** `[v128] --> [v128]` */
    i8x16_abs                           = 0x60,
    /** `[v128] --> [v128]` */
    i8x16_neg                           = 0x61,
    /** `[v128] --> [v128]` */
    i8x16_popcnt                        = 0x62,
    /** `[v128] --> [i32]` */
    i8x16_all_true                      = 0x63,
    /** `[v128] --> [i32]` */
    i8x16_bitmask                       = 0x64,
    /** `[v128, v128] --> [v128]` */
    i8x16_narrow_i16x8_s                = 0x65,
    /** `[v128, v128] --> [v128]` */
    i8x16_narrow_i16x8_u                = 0x66,
    /** `[v128] --> [v128]` */
    f32x4_ceil                          = 0x67,
    /** `[v128] --> [v128]` */
    f32x4_floor                         = 0x68,
    /** `[v128] --> [v128]` */
    f32x4_trunc                         = 0x69,
    /** `[v128] --> [v128]` */
    f32x4_nearest                       = 0x6a,
    /** `[v128, i32] --> [v128]` */
    i8x16_shl                           = 0x6b,
    /** `[v128, i32] --> [v128]` */
    i8x16_shr_s                         = 0x6c,
    /** `[v128, i32] --> [v128]` */
    i8x16_shr_u                         = 0x6d,
    /** `[v128, v128] --> [v128]` */
    i8x16_add                           = 0x6e,
    /** `[v128, v128] --> [v128]` */
    i8x16_add_sat_s                     = 0x6f,
    /** `[v128, v128] --> [v128]` */
    i8x16_add_sat_u                     = 0x70,
    /** `[v128, v128] --> [v128]` */
    i8x16_sub                           = 0x71,
    /** `[v128, v128] --> [v128]` */
    /** `[v128, v128] --> [v128]` */
    i8x16_sub_sat_s                     = 0x72,
    /** `[v128, v128] --> [v128]` */
    i8x16_sub_sat_u                     = 0x73,
    /** `[v128] --> [v128]` */
    f64x2_ceil                          = 0x74,
    /** `[v128] --> [v128]` */
    f64x2_floor                         = 0x75,
    /** `[v128, v128] --> [v128]` */
    i8x16_min_s                         = 0x76,
    /** `[v128, v128] --> [v128]` */
    i8x16_min_u                         = 0x77,
    /** `[v128, v128] --> [v128]` */
    i8x16_max_s                         = 0x78,
    /** `[v128, v128] --> [v128]` */
    i8x16_max_u                         = 0x79,
    /** `[v128] --> [v128]` */
    f64x2_trunc                         = 0x7a,
    /** `[v128, v128] --> [v128]` */
    i8x16_avgr_u                        = 0x7b,
    /** `[v128] --> [v128]` */
    i16x8_extadd_pairwise_i8x16_s       = 0x7c,
    /** `[v128] --> [v128]` */
    i16x8_extadd_pairwise_i8x16_u       = 0x7d,
    /** `[v128] --> [v128]` */
    i32x4_extadd_pairwise_i8x16_s       = 0x7e,
    /** `[v128] --> [v128]` */
    i32x4_extadd_pairwise_i8x16_u       = 0x7f,
    /** `[v128] --> [v128]` */
    i16x8_abs                           = 0x80,
    /** `[v128] --> [v128]` */
    i16x8_neg                           = 0x81,
    /** `[v128, v128] --> [v128]` */
    i16x8_q15mulr_sat_s                 = 0x82,
    /** `[v128] --> [i32]` */
    i16x8_all_true                      = 0x83,
    /** `[v128] --> [i32]` */
    i16x8_bitmask                       = 0x84,
    /** `[v128, v128] --> [v128]` */
    i16x8_narrow_i32x4_s                = 0x85,
    /** `[v128, v128] --> [v128]` */
    i16x8_narrow_i32x4_u                = 0x86,
    /** `[v128] --> [v128]` */
    i16x8_extend_low_i8x16_s            = 0x87,
    /** `[v128] --> [v128]` */
    i16x8_extend_high_i8x16_s           = 0x88,
    /** `[v128] --> [v128]` */
    i16x8_extend_low_i8x16_u            = 0x89,
    /** `[v128] --> [v128]` */
    i16x8_extend_high_i8x16_u           = 0x8a,
    /** `[v128, i32] --> [v128]` */
    i16x8_shl                           = 0x8b,
    /** `[v128, i32] --> [v128]` */
    i16x8_shr_s                         = 0x8c,
    /** `[v128, i32] --> [v128]` */
    i16x8_shr_u                         = 0x8d,
    /** `[v128, v128] --> [v128]` */
    i16x8_add                           = 0x8e,
    /** `[v128, v128] --> [v128]` */
    i16x8_add_sat_s                     = 0x8f,
    /** `[v128, v128] --> [v128]` */
    i16x8_add_sat_u                     = 0x90,
    /** `[v128, v128] --> [v128]` */
    i16x8_sub                           = 0x91,
    /** `[v128, v128] --> [v128]` */
    i16x8_sub_sat_s                     = 0x92,
    /** `[v128, v128] --> [v128]` */
    i16x8_sub_sat_u                     = 0x93,
    /** `[v128] --> [v128]` */
    f64x2_nearest                       = 0x94,
    /** `[v128, v128] --> [v128]` */
    i16x8_mul                           = 0x95,
    /** `[v128, v128] --> [v128]` */
    i16x8_min_s                         = 0x96,
    /** `[v128, v128] --> [v128]` */
    i16x8_min_u                         = 0x97,
    /** `[v128, v128] --> [v128]` */
    i16x8_max_s                         = 0x98,
    /** `[v128, v128] --> [v128]` */
    i16x8_max_u                         = 0x99,
    /** `[v128, v128] --> [v128]` */
    i16x8_avgr_u                        = 0x9b,
    /** `[v128, v128] --> [v128]` */
    i16x8_extmul_low_i8x16_s            = 0x9c,
    /** `[v128, v128] --> [v128]` */
    i16x8_extmul_high_i8x16_s           = 0x9d,
    /** `[v128, v128] --> [v128]` */
    i16x8_extmul_low_i8x16_u            = 0x9e,
    /** `[v128, v128] --> [v128]` */
    i16x8_extmul_high_i8x16_u           = 0x9f,
    /** `[v128] --> [v128]` */
    i32x4_abs                           = 0xa0,
    /** `[v128] --> [v128]` */
    i32x4_neg                           = 0xa1,
    /** `[v128] --> [i32]` */
    i32x4_all_true                      = 0xa3,
    /** `[v128] --> [i32]` */
    i32x4_bitmask                       = 0xa4,
    /** `[v128] --> [v128]` */
    i32x4_extend_low_i16x8_s            = 0xa7,
    /** `[v128] --> [v128]` */
    i32x4_extend_high_i16x8_s           = 0xa8,
    /** `[v128] --> [v128]` */
    i32x4_extend_low_i16x8_u            = 0xa9,
    /** `[v128] --> [v128]` */
    i32x4_extend_high_i16x8_u           = 0xaa,
    /** `[v128, i32] --> [v128]` */
    i32x4_shl                           = 0xab,
    /** `[v128, i32] --> [v128]` */
    i32x4_shr_s                         = 0xac,
    /** `[v128, i32] --> [v128]` */
    i32x4_shr_u                         = 0xad,
    /** `[v128, v128] --> [v128]` */
    i32x4_add                           = 0xae,
    /** `[v128, v128] --> [v128]` */
    i32x4_sub                           = 0xb1,
    /** `[v128, v128] --> [v128]` */
    i32x4_mul                           = 0xb5,
    /** `[v128, v128] --> [v128]` */
    i32x4_min_s                         = 0xb6,
    /** `[v128, v128] --> [v128]` */
    i32x4_min_u                         = 0xb7,
    /** `[v128, v128] --> [v128]` */
    i32x4_max_s                         = 0xb8,
    /** `[v128, v128] --> [v128]` */
    i32x4_max_u                         = 0xb9,
    /** `[v128, v128] --> [v128]` */
    i32x4_dot_i16x8_s                   = 0xba,
    /** `[v128, v128] --> [v128]` */
    i32x4_extmul_low_i16x8_s            = 0xbc,
    /** `[v128, v128] --> [v128]` */
    i32x4_extmul_high_i16x8_s           = 0xbd,
    /** `[v128, v128] --> [v128]` */
    i32x4_extmul_low_i16x8_u            = 0xbe,
    /** `[v128, v128] --> [v128]` */
    i32x4_extmul_high_i16x8_u           = 0xbf,
    /** `[v128] --> [v128]` */
    i64x2_abs                           = 0xc0,
    /** `[v128] --> [v128]` */
    i64x2_neg                           = 0xc1,
    /** `[v128] --> [i32]` */
    i64x2_all_true                      = 0xc3,
    /** `[v128] --> [i32]` */
    i64x2_bitmask                       = 0xc4,
    /** `[v128] --> [v128]` */
    i64x2_extend_low_i32x4_s            = 0xc7,
    /** `[v128] --> [v128]` */
    i64x2_extend_high_i32x4_s           = 0xc8,
    /** `[v128] --> [v128]` */
    i64x2_extend_low_i32x4_u            = 0xc9,
    /** `[v128] --> [v128]` */
    i64x2_extend_high_i32x4_u           = 0xca,
    /** `[v128, i32] --> [v128]` */
    i64x2_shl                           = 0xcb,
    /** `[v128, i32] --> [v128]` */
    i64x2_shr_s                         = 0xcc,
    /** `[v128, i32] --> [v128]` */
    i64x2_shr_u                         = 0xcd,
    /** `[v128, v128] --> [v128]` */
    i64x2_add                           = 0xce,
    /** `[v128, v128] --> [v128]` */
    i64x2_sub                           = 0xd1,
    /** `[v128, v128] --> [v128]` */
    i64x2_mul                           = 0xd5,
    /** `[v128, v128] --> [v128]` */
    i64x2_eq                            = 0xd6,
    /** `[v128, v128] --> [v128]` */
    i64x2_ne                            = 0xd7,
    /** `[v128, v128] --> [v128]` */
    i64x2_lt_s                          = 0xd8,
    /** `[v128, v128] --> [v128]` */
    i64x2_gt_s                          = 0xd9,
    /** `[v128, v128] --> [v128]` */
    i64x2_le_s                          = 0xda,
    /** `[v128, v128] --> [v128]` */
    i64x2_ge_s                          = 0xdb,
    /** `[v128, v128] --> [v128]` */
    i64x2_extmul_low_i32x4_s            = 0xdc,
    /** `[v128, v128] --> [v128]` */
    i64x2_extmul_high_i32x4_s           = 0xdd,
    /** `[v128, v128] --> [v128]` */
    i64x2_extmul_low_i32x4_u            = 0xde,
    /** `[v128, v128] --> [v128]` */
    i64x2_extmul_high_i32x4_u           = 0xdf,
    /** `[v128] --> [v128]` */
    f32x4_abs                           = 0xe0,
    /** `[v128] --> [v128]` */
    f32x4_neg                           = 0xe1,
    /** `[v128] --> [v128]` */
    f32x4_sqrt                          = 0xe3,
    /** `[v128, v128] --> [v128]` */
    f32x4_add                           = 0xe4,
    /** `[v128, v128] --> [v128]` */
    f32x4_sub                           = 0xe5,
    /** `[v128, v128] --> [v128]` */
    f32x4_mul                           = 0xe6,
    /** `[v128, v128] --> [v128]` */
    f32x4_div                           = 0xe7,
    /** `[v128, v128] --> [v128]` */
    f32x4_min                           = 0xe8,
    /** `[v128, v128] --> [v128]` */
    f32x4_max                           = 0xe9,
    /** `[v128, v128] --> [v128]` */
    f32x4_pmin                          = 0xea,
    /** `[v128, v128] --> [v128]` */
    f32x4_pmax                          = 0xeb,
    /** `[v128] --> [v128]` */
    f64x2_abs                           = 0xec,
    /** `[v128] --> [v128]` */
    f64x2_neg                           = 0xed,
    /** `[v128] --> [v128]` */
    f64x2_sqrt                          = 0xef,
    /** `[v128, v128] --> [v128]` */
    f64x2_add                           = 0xf0,
    /** `[v128, v128] --> [v128]` */
    f64x2_sub                           = 0xf1,
    /** `[v128, v128] --> [v128]` */
    f64x2_mul                           = 0xf2,
    /** `[v128, v128] --> [v128]` */
    f64x2_div                           = 0xf3,
    /** `[v128, v128] --> [v128]` */
    f64x2_min                           = 0xf4,
    /** `[v128, v128] --> [v128]` */
    f64x2_max                           = 0xf5,
    /** `[v128, v128] --> [v128]` */
    f64x2_pmin                          = 0xf6,
    /** `[v128, v128] --> [v128]` */
    f64x2_pmax                          = 0xf7,
    /** `[v128] --> [v128]` */
    i32x4_trunc_sat_f32x4_s             = 0xf8,
    /** `[v128] --> [v128]` */
    i32x4_trunc_sat_f32x4_u             = 0xf9,
    /** `[v128] --> [v128]` */
    f32x4_convert_i32x4_s               = 0xfa,
    /** `[v128] --> [v128]` */
    f32x4_convert_i32x4_u               = 0xfb,
    /** `[v128] --> [v128]` */
    i32x4_trunc_sat_f64x2_s_zero        = 0xfc,
    /** `[v128] --> [v128]` */
    i32x4_trunc_sat_f64x2_u_zero        = 0xfd,
    /** `[v128] --> [v128]` */
    f64x2_convert_low_i32x4_s           = 0xfe,
    /** `[v128] --> [v128]` */
    f64x2_convert_low_i32x4_u           = 0xff

}