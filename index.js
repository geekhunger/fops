import {
    join,
    dirname,
    basename,
    extname
} from "path"

import {
    statSync,
    existsSync,
    readdirSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
    rmSync
} from "fs"

import callsites from "callsites"
const getCallerFilepath = () => callsites()[2].getFileName()

import Mime from "mime"
const getMimeType = Mime.getType

import scope from "nodejs-scope"
import {execSync} from "child_process"

import {assert, type} from "type-approve"
import strim from "string-slurp"


export const sizeunit = function(value = 0) {
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


export const timeunit = function(value = 0) {
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


export const mkfolder = function(path) { // create directory (recursevly)
    /*assert(
        extname(path).length === 0,
        `Folder names are not allowed to have extensions of type file! In other words, '${basename(path, extname(path))}${extname(path)}' could not be created inside of '${dirname(path)}' because it's not allowed to have '${extname(path)}'.`
    )*/
    if(/^\./i.test(path)) {
        path += "/./" // convert dot-files into folders!
    }
    //path = resolve(ROOTPATH.toString(), path) // restrict folder creation to project directory!
    if(!existsSync(path)) {
        return mkdirSync(path, {recursive: true})
    }
}


export const mkfile = function(path, content, action = "w", mode = 0o744) { // create file
    mkfolder(dirname(path))
    try { // try-catch needed because writeFileSync does not have a return value, instead it throws an error on failure
        writeFileSync(path, content, {flag: action, mode: mode})
        return true
    } catch(failure) {
        console.warn(`Could not create file '${path}' because of error: ${failure.message}`)
        return false
    }
}


export const mkscript = function(filepath, contents, environment) {
    if(type({nil: environment}) || environment === scope.env) { // create file only if it's meant for given environment
        return mkfile(
            filepath,
            `#!/bin/bash\n\n# This script has been auto-generated\n# Generator source can be found at '${getCallerFilepath()}'\n\n${contents}`,
            "w", // override existing file
            0o750
        )
    }
}


export const mkgitignore = function(path, rules) {
    assert(type({strings: [path, rules]}) && path.length > 0 && rules.length > 0, "Gitignore file requires a filepath and contents!")

    path = path
        .replace(/\/*$/, "/") // flatten trailing slashes
        .replace(/(\.gitignore)?$/, ".gitignore") // cast filename

    const read = fallback => catfile(path, "utf8").content || fallback
    const write = contents => mkfile(path, contents)
    const contains = (contents, rule) => contents.split("\n").some(line => rule.test(line))

    const merge = (contents, requirements) => {
        const rules = [
            strim(contents).split("\n"),
            strim(requirements).split("\n")
        ]
        return [...new Set(rules.flat())].join("\n") // keep only unique line entries
    }
    
    let content_new = merge(
        read(`# This file has been auto-generated\n# Generator source can be found at '${getCallerFilepath()}'\n${strim(rules)}`), // read contents of existing .gitignore file or fallback to given content
        rules // merge new gitignore rules with existing content (without duplicate entries)
    )

    if(!contains(content_new, /.gitignore$/i) && !contains(content_new, /^\*$/)) {
        content_new += "\n.gitignore" // git untrack self
    }

    write(content_new)
}


export const rmfolder = function(path) { // remove file or folder recursevly
    try {
        rmSync(path, {recursive: true, force: true})
        return true
    } catch(failure) {
        console.warn(`Could not remove file '${path}' because of error: ${failure.message}`)
        return false
    }
}


export const rmfile = rmfolder // alias


/*
    read files recursevly
    @path can be:
        a single filename,
        a single folder name,
        an array of many filenames,
        an array of many folder names
        or even a mixed array of file and folder names
*/
export const catfolder = function(path, encoding) {
    const files = []
    for(const file of !Array.isArray(path) ? [path] : path) {
        try {
            const asset = statSync(file) // will throw error if not file or directory
            if(asset.isFile()) {
                files.push({
                    content: readFileSync(file, {encoding: encoding}), // encoding can be "base64" or "ascii" or "binary"
                    encoding: encoding,
                    mime: getMimeType(file),
                    size: sizeunit(asset.size),
                    name: basename(file),
                    //time: timeunit() // TODO https://www.unixtutorial.org/atime-ctime-mtime-in-unix-filesystems/
                })
            } else if(asset.isDirectory()) {
                const paths = readdirSync(file).map(name => join(file, name))
                files.push(catfile(paths, encoding))
            }
        } catch(exception) {
            files.push({ // content and size values indicate that file does not exist!
                content: null,
                encoding: undefined,
                mime: undefined,
                size: sizeunit(0),
                name: basename(file),
                //time: undefined
            })
            console.warn(`Could not fetch file '${path}' because of error: ${exception.message}`)
        }
    }
    return files
}


// theoretically just an alias to .catfolder(), but but this function
// returns an array when @path is also an array (or when @path is a string but it leads to a directory)
// returns a single object when @path is a string that points to a file
export const catfile = function(path, encoding) {
    const files = catfolder(path, encoding)
    return Array.isArray(path) || (existsSync(path) && statSync(path).isDirectory())
        ? files
        : files[0]
}


export const exec = function(command, options) {
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


export const runscript = function(value) { // run shell command and throw on errors with message from stdout
    if(type({filepath: value}) && !/^sh\s/i.test(value)) {
        value = catfile(value, "utf8").content
    }
    return assert(...Object.values(exec(value)))
}


export default {
    sizeunit,
    timeunit,
    mkfolder,
    mkfile,
    mkscript,
    mkgitignore,
    rmfolder,
    rmfile,
    catfolder,
    catfile,
    exec,
    runscript
}
