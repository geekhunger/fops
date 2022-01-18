# fops

Lightweight wrappers around synchchronous file operations in NodeJS. Currently, there are only five operations available:

- **`mkfolder(path)`** creates a folder recursevly
- **`mkfile(path, content, permissions = 0o744)`** creates a file recursevly and sets its permissions
- **`rmfolder(path)` and `rmfile(path)`** deletes a folder or a file recursevly
- **`catfile(path, encoding = "base64")`** reads a file and returns its content as specified by encoding parameter

