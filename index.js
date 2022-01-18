const fn = module.exports = {}


fn.mkfolder = path => { // create directory (recursevly)
    /*fn.assert(
        extname(path).length === 0,
        `Folder names are not allowed to have extensions of type file! In other words, '${basename(path, extname(path))}${extname(path)}' could not be created inside of '${dirname(path)}' because it's not allowed to have '${extname(path)}'.`
    )*/
    if(/^\./i.test(path)) path += "/./" // convert dot-files into folders!
    path = resolve(ROOTPATH.toString(), path) // restrict folder creation to project directory!
    if(!fs.existsSync(path)) return fs.mkdirSync(path, {recursive: true})
}


fn.mkfile = (path, content, permissions = 0o744) => { // create file
    fn.mkfolder(dirname(path))
    try { // try-catch needed because fs.writeFileSync does not have a return value, instead it throws an error on failure
        fs.writeFileSync(path, content, {mode: permissions})
        return true
    } catch(failure) {
        console.error(`Could not create file '${path}' because of error: ${failure.message}`)
        return false
    }
}


fn.rmfile = fn.rmfolder = path => { // remove file or folder recursevly
    try {
        fs.rmSync(path, {recursive: true, force: true})
        return true
    } catch(failure) {
        console.error(`Could not create file '${path}' because of error: ${failure.message}`)
        return false
    }
}


fn.catfile = fn.catfolder = (path, encoding = "base64") => { // read files recursevly (@path can be a single filename, an array of many filenames, a single folder name, an array of many folder names or even a mixed array of file and folder names)
    const files = []
    for(const file of !Array.isArray(path) ? [path] : path) {
        const asset = fs.statSync(file)
        if(asset.isFile()) {
            files.push({
                content: fs.readFileSync(file, {encoding: encoding}),
                encoding: encoding,
                mime: mimetype(file),
                size: fn.storage_unit_lookup(asset.size),
                name: basename(file),
            })
        } else if(asset.isDirectory()) {
            const paths = fs.readdirSync(file).map(name => join(file, name))
            files.push(fn.catfile(paths, encoding))
        }
    }
    return files
}
