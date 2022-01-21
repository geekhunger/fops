# synchronous file operations

Lightweight wrappers around synchchronous file operations in NodeJS. Currently, only these operations are available:


<br>

- **`mkfolder(path)`**

Create a folder recursevly at given `path`.


<br>

- **`mkfile(path, content, action = "w", mode = 0o744)`**

Create a file at given `path`. Any folders are created recursevly along the way.

The `action` argument sets the file interaction flag like `'a'` as in 'append'. (Default is `'w'` as in 'write'.) [See this list](https://nodejs.org/api/fs.html#file-system-flags) for all supported flags.

The `mode` argument sets the file permissions (`chmod`).


<br>

- **`rmfolder(path)` and `rmfile(path)`**

Delete a folder or a file recursevly at given `path`.


<br>

- **`catfile(path, encoding)`**

Read a file(s) at given `path` (`path` can be a string or an array of strings).

The return value is an array of objects. Each object represents one file that has been read. For example:

```js
[
    {
        content: <Buffer 68 65 6c 6c 6f 20 77 6f 72 6c 64 0a>,
        encoding: undefined,
        mime: 'text/plain',
        size: {
            value: 12,
            byte: [Getter/Setter],
            kilobyte: [Getter/Setter],
            megabyte: [Getter/Setter],
            gigabyte: [Getter/Setter]
        }
    }
]
```

Without an `encoding` argument the `content` property will be a `Buffer`! - With an `encoding` argument, the `content` will become a string (encoded by `encoding` format) and the `encoding` property will be present. You can then use the `content` string as you like, or use buffers yourself to convert it into a different format. [(See this documentation on encoding formats)](https://nodejs.org/docs/latest/api/buffer.html#buffers-and-character-encodings)

The `size` propery is an object with getters and setters and helps converting the file size into different units, like byte into megabyte and vice versa.


<br>

- **`unitsize(byte)`**

This is a helper... but it is available too!

Calling it with an argument will set the default value in byte! For example: `unitsize(16)` - From there on, you can convert the value into `byte`, `kilobyte`, `megabyte` or `gigabyte`, for example: `console.log( unitsize(16).megabyte )`

You can also directly set a value in `megabyte` if you want, and then convert it back into `byte`. For example:

```js
const mb = unitsize()
console.log(mb) // default byte value is 0
mb.megabyte = 3 // setter will convert the value into byte internally
console.log(mb.byte)
console.log(mb.megabyte)
```
