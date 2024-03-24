import {
    dirname,
    basename,
    extname,
    join,
    resolve,
    sep as PATH_SEPARATOR
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

import rootpath from "app-root-path"
import scope from "nodejs-scope"
import {execSync} from "child_process"

import {assert, type} from "type-approve"
import strim from "string-slurp"


const isFilepath = function(value) {
    if(!existsSync(value)) return false
    return statSync(value).isFile()
}


const isFolderpath = function(value) {
    if(!existsSync(value)) return false
    return statSync(value).isDirectory()
}


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


export const createFolder = function(path, dotnames = true, sandbox = false) { // recursive creation of directory
    if(sandbox === true) {
        assert(path === resolve(rootpath.toString(), path), `Directory '${path}' is outside of the sandboxed project folder '${rootpath.toString()}'!`)
    }
    if(dotnames !== true) {
        const malformed_subfolders = path?.split(PATH_SEPARATOR)?.filter(Boolean)?.every(part => extname(part).length === 0) || []
        const error_messages = malformed_subfolders.map(folder => `Folder '${basename(folder)}' must not contain a file type extension '${extname(folder)}'!`)
        assert(isFolderpath(path) && malformed_subfolders.length === 0, `Directory '${path}' contains malformed sub-folder names!\n${error_messages.join("\n\t")}`)
    }
    if(/^\./i.test(path)) {
        path += "/./" // convert dot-files into folders!
    }
    if(!existsSync(path)) {
        mkdirSync(path, {recursive: true})
    }
    return true
}


export const createFile = function(path, content, action = "w", mode = 0o744, dir_dotnames = true, sandbox = false) { // recursive creation of file
    createFolder(dirname(path), dir_dotnames, sandbox)
    try { // try-catch needed because writeFileSync does not have a return value, instead it throws an error on failure
        writeFileSync(path, content, {flag: action, mode: mode})
        return true
    } catch(exception) {
        console.warn(`Could not create file '${path}' because of error: ${exception.message}`)
        return false
    }
}


export const mkscript = function(filepath, contents, environment, gitignore = false) {
    if(type({nil: environment}) || environment === scope.env) { // create file only if it's meant for given environment
        const status = createFile(
            filepath,
            `#!/bin/bash\n\n# This script has been auto-generated\n# Generator source can be found at '${getCallerFilepath()}'\n\n${strim(contents)}`,
            "w", // override existing file
            0o750
        )
        if(gitignore === true) {
            return mkgitignore(dirname(filepath), basename(filepath)) && status
        }
        return status
    }
}


export const mkgitignore = function(path, rules, selfignore = false) {
    assert(type({strings: [path, rules]}) && path.length > 0 && rules.length > 0, "Gitignore file requires a filepath and contents!")

    path = path
        .replace(/\/*$/, "/") // flatten trailing slashes
        .replace(/(\.gitignore)?$/, ".gitignore") // cast filename

    const read = fallback => openFile(path, "utf8").content || fallback
    const write = contents => createFile(path, contents)
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

    if(!contains(content_new, /.gitignore$/i) && !contains(content_new, /^\*$/) && selfignore === true) {
        content_new += "\n.gitignore" // git untrack self
    }

    return write(content_new)
}


export const deleteFile = function(path) { // recursive removal of file or folder
    try {
        rmSync(path, {recursive: true, force: true})
        return true
    } catch(failure) {
        console.warn(`Could not delete file '${path}'! ${failure.message}`)
        return false
    }
}


export const deleteFolder = deleteFile // convenience alias


/*
    synchronious (and recursive) read of files
    @sources can be:
        a single file name,
        a single folder name,
        an array of many file names,
        an array of many folder names
        or even a mixed array of file and folder names
*/
export const openFiles = function(sources, encoding) {
    if(!type({array: sources})) {
        sources = [sources]
    }
    const malformed_paths = sources.filter(path => !isFilepath(path) && !isFolderpath(path))
    assert(malformed_paths.length === 0, `Found malformed paths ${JSON.stringify(malformed_paths)}!`)
    let files = []
    for(let path of sources) {
        try {
            const asset = statSync(path) // will throw error if not file or directory
            if(asset.isFile()) {
                files.push({
                    content: readFileSync(path, {encoding}), // encoding can for example be one of ["utf8", "base64", "ascii", "binary"]
                    encoding,
                    mime: Mime.getType(path),
                    size: sizeunit(asset.size),
                    directory: dirname(path),
                    name: basename(path),
                    created: asset.birthtime, //timeunit(asset.birthtimeMs) // https://www.unixtutorial.org/atime-ctime-mtime-in-unix-filesystems
                    modified: asset.mtime //timeunit(asset.mtimeMs)
                })
            } else if(asset.isDirectory()) {
                const paths = readdirSync(path).map(name => join(path, name))
                files.push(openFiles(paths, encoding))
            }
        } catch(exception) {
            files.push({ // content and size values indicate that file does not exist!
                content: null,
                encoding: undefined,
                mime: undefined,
                size: sizeunit(0),
                directory: dirname(path),
                created: undefined,
                modified: undefined,
                name: basename(path),
            })
            console.warn(`Could not read file '${path}'! ${exception.message}`)
        }
    }
    // if(files.length > 1 && (sources.length > 1 || (sources.length === 1 && isFolderpath(sources[0])))) {
    //     return files // return an array of files when @sources contained more than one path, or when @sources had only one path but it was a directory
    // }
    // return files[0]
    return files
}


export const openFile = function(path, encoding) { // a convenience alias to `openFiles(path, encoding)[0]`
    assert(isFilepath(path), `Malformed path '${path}'!`)
    return openFiles(path, encoding)?.[0] || null
}


export const openJsonFile = function(path) {
    const file = openFile(path, "utf8")
    assert(type({object: file}) && file.content !== null && file.size?.value > 0, `Invalid JSON file '${path}'!`)
    const content = JSON.parse(file.content)
    assert(type({object: content}, {array: content}, {string: content}, {number: content}, {boolean: content}) || content === null, `Malformed content in file '${path}'!`)
    if(type({object: content})) {
        return {...content}
    } else if(type({array: content})) {
        return [...content]
    }
    return content // string, number, boolean or null
}


export const readPlist = function(src, env = scope.env) {
    let path = null
    if(isFilepath(src)) {
        path = src
        src = openJsonFile(path)
    }
    assert(
        type({object: src}), // a property lists are always pairs of {"key": "value"}
        "Malformed PLIST" + !path
            ? `:\n${JSON.stringify(content, null, "\t")}`
            : ` file '${path}'!`
    )
    if(!type({nil: env})) { // if @env is null or undefined
        assert(
            Object.keys(src).some(prop => prop.startsWith(env)),
            `Missing environment '${env}' in PLIST` + !path
                ? `:\n${JSON.stringify(content, null, "\t")}`
                : ` file '${path}'!`
        )
        assert(
            type({object: src[env]}, {array: src[env]}),
            `Malformed PLIST for environment '${env}'` + !path
                ? `:\n${JSON.stringify(src[env], null, "\t")}`
                : ` file '${path}'!`
        )
    }
    return src[env]
}


export const executeCommand = function(command, options) {
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


export const executeScript = function(src) { // run shell command and throw on errors with message from stdout
    if(isFilepath(src)) {
        src = openFile(src, "utf8").content
    }
    return assert(...Object.values(executeCommand(src)))
}


export default {
    sizeunit,
    timeunit,
    createDirectory,
    createFile,
    createScriptFile,
    createGitignoreFile,
    deleteFolder,
    deleteFile,
    openFile,
    openFolder,
    executeCommand,
    executeScript
}
