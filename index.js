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

const mimetype = path => {
    return require("mime").types[extname(path).substr(1)]
}

const unit_lookup = (value = 0) => {
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


fn.catfile = fn.catfolder = (path, encoding) => { // read files recursevly (@path can be a single filename, an array of many filenames, a single folder name, an array of many folder names or even a mixed array of file and folder names)
    const files = []
    for(const file of !Array.isArray(path) ? [path] : path) {
        const asset = statSync(file)
        if(asset.isFile()) {
            files.push({
                content: readFileSync(file, {encoding: encoding}), // encoding can be "base64" or "ascii" or "binary"
                encoding: encoding,
                mime: mimetype(file),
                size: unit_lookup(asset.size),
                name: basename(file),
            })
        } else if(asset.isDirectory()) {
            const paths = readdirSync(file).map(name => join(file, name))
            files.push(fn.catfile(paths, encoding))
        }
    }
    return files
}
