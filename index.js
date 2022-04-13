const fn = module.exports = {}

const {
    join,
    dirname,
    basename,
    extname
} = require("path")

const {
    statSync,
    existsSync,
    readdirSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
    rmSync
} = require("fs")

const {execSync} = require("child_process")

const mimetype = path => require("mime").types[extname(path).substr(1)]


fn.sizeunit = (value = 0) => {
    return {
        value: value,
        set byte(n)     {this.value = n},
        set kilobyte(n) {this.value = n * 1024},
        set megabyte(n) {this.value = n * 1024 * 1024},
        set gigabyte(n) {this.value = n * 1024 * 1024 * 1024},
        get byte()      {return this.value},
        get kilobyte()  {return this.value / 1024},
        get megabyte()  {return this.value / 1024 / 1024},
        get gigabyte()  {return this.value / 1024 / 1024 / 1024}
    }
}


fn.timeunit = (value = 0) => {
    return {
        value: value,
        set milliseconds(n) {this.value = n},
        set seconds(n)      {this.value = n * 1000},
        set minutes(n)      {this.value = n * 1000 * 60},
        set hours(n)        {this.value = n * 1000 * 60 * 60},
        set days(n)         {this.value = n * 1000 * 60 * 60 * 24},
        get milliseconds()  {return this.value},
        get seconds()       {return this.value / 1000},
        get minutes()       {return this.value / 1000 / 60},
        get hours()         {return this.value / 1000 / 60 / 60},
        get days()          {return this.value / 1000 / 60 / 60 / 24}
    }
}


fn.mkfolder = path => { // create directory (recursevly)
    /*fn.assert(
        extname(path).length === 0,
        `Folder names are not allowed to have extensions of type file! In other words, '${basename(path, extname(path))}${extname(path)}' could not be created inside of '${dirname(path)}' because it's not allowed to have '${extname(path)}'.`
    )*/
    if(/^\./i.test(path)) path += "/./" // convert dot-files into folders!
    //path = resolve(ROOTPATH.toString(), path) // restrict folder creation to project directory!
    if(!existsSync(path)) return mkdirSync(path, {recursive: true})
}


fn.mkfile = (path, content, action = "w", mode = 0o744) => { // create file
    fn.mkfolder(dirname(path))
    try { // try-catch needed because writeFileSync does not have a return value, instead it throws an error on failure
        writeFileSync(path, content, {flag: action, mode: mode})
        return true
    } catch(failure) {
        console.error(`Could not create file '${path}' because of error: ${failure.message}`)
        return false
    }
}


fn.rmfile = fn.rmfolder = path => { // remove file or folder recursevly
    try {
        rmSync(path, {recursive: true, force: true})
        return true
    } catch(failure) {
        console.error(`Could not remove file '${path}' because of error: ${failure.message}`)
        return false
    }
}


/*
    read files recursevly
    @path can be:
        a single filename,
        a single folder name,
        an array of many filenames,
        an array of many folder names
        or even a mixed array of file and folder names
*/
fn.catfolder = (path, encoding) => {
    const files = []
    for(const file of !Array.isArray(path) ? [path] : path) {
        try {
            const asset = statSync(file)
            if(asset.isFile()) {
                files.push({
                    content: readFileSync(file, {encoding: encoding}), // encoding can be "base64" or "ascii" or "binary"
                    encoding: encoding,
                    mime: mimetype(file),
                    size: fn.sizeunit(asset.size),
                    name: basename(file),
                    //time: fn.timeunit() // TODO https://www.unixtutorial.org/atime-ctime-mtime-in-unix-filesystems/
                })
            } else if(asset.isDirectory()) {
                const paths = readdirSync(file).map(name => join(file, name))
                files.push(fn.catfile(paths, encoding))
            }
        } catch(exception) {
            files.push({ // content and size values indicate that file does not exist!
                content: null,
                encoding: undefined,
                mime: undefined,
                size: fn.sizeunit(0),
                name: basename(file),
                //time: undefined
            })
            console.error(`Could not fetch file '${path}' because of error: ${exception.message}`)
        }
    }
    return files
}


// theoretically just an alias to .catfolder(), but but this function
// returns an array when @path is also an array (or when @path is a string but it leads to a directory)
// returns a single object when @path is a string that points to a file
fn.catfile = (path, encoding) => {
    const files = fn.catfolder(path, encoding)
    return Array.isArray(path) || (existsSync(path) && statSync(path).isDirectory())
        ? files
        : files[0]
}


fn.exec = (command, options) => {
    try {
        return {
            success: true,
            stdout: execSync(command, options).toString().trim()
        }
    } catch(failure) {
        return {
            success: false,
            stdout: failure.toString().trim()
            // `failure.stderr` contains the a short-form error message
            // `failure` contains the entire trace stack, including the short-form error message
        }
    }
}
