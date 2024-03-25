import {
    dirname,
    basename,
    extname,
    resolve,
    join,
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


export const sizeUnit = function(value = 0) {
    return {
        value: value,   // byte
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


export const timeUnit = function(value = 0) {
    return {
        value: value,       // milliseconds
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


export const hasFolder = function(value) {
    if(!existsSync(value)) return false
    return statSync(value).isDirectory()
}


export const hasFile = function(value) {
    if(!existsSync(value)) return false
    return statSync(value).isFile()
}


export const createFolder = function(path, sandbox = true, dotnames = true) { // recursive creation of directory
    if(dotnames !== true) {
        const cwd = rootpath.toString()
        const folders = resolve(cwd, dirname(path)).split(PATH_SEPARATOR)
        const dir = folders[folders.length - 1]
        assert(
            !dir.startsWith(".") && dir.match(/\w+/) !== null,
            `Directory '${path}' must not have a dot-name!`
        )
    }
    if(sandbox === true) {
        const cwd = rootpath.toString()
        const dir = dirname(path)
        const file = basename(path)
        assert(
            resolve(cwd, dir).match(/^\.+[\\\/]/) === null,
            `Directory '${path}' is outside of the sandboxed project folder '${cwd}'!`
        )
        path = join(rootpath.resolve(dir), file)
    }
    if(!existsSync(path)) {
        mkdirSync(path, {recursive: true})
    }
}


export const createFile = function(path, content, action = "w", mode = 0o755, folder_sandbox = true, folder_dotnames = true) { // recursive creation of file
    createFolder(dirname(path), folder_sandbox, folder_dotnames)
    writeFileSync(path, content, {flag: action, mode: mode})
}


export const changeFilePermissions = function(path, mode = 755) {
    const {success, stdout} = executeCommand(`chmod ${mode} '${path}'`)
    assert(success === true, stdout)
}


export const createScript = function(filepath, contents, mode = 0o750, environment, gitignore = false) {
    if(type({nil: environment}) || environment === scope.env) { // create file only if it's meant for given environment
        const sourceref = "# This script has been auto-generated. Source can be found at: " + getCallerFilepath()
        let shebang = contents.trimStart().slice(0, contents.trimEnd().indexOf("\n"))
        if(!shebang.startsWith("#!")) {
            shebang = "#!/bin/bash"
        } else {
            contents = contents.slice(shebang.length)
        }
        createFile(filepath, shebang + "\n\n" + sourceref + "\n\n" + strim(contents), "w", mode)
        if(gitignore === true) {
            createGitignore(dirname(filepath), basename(filepath))
        }
    }
}


export const createGitignore = function(path, rules, selfignore = false) {
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

    write(content_new)
}


export const deleteFile = function(path) { // recursive removal of file or folder
    rmSync(path, {recursive: true, force: true})
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
    const malformed_paths = sources.filter(path => !hasFile(path) && !hasFolder(path))
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
                    size: sizeUnit(asset.size),
                    directory: dirname(path),
                    name: basename(path),
                    created: asset.birthtime, //timeUnit(asset.birthtimeMs) // https://www.unixtutorial.org/atime-ctime-mtime-in-unix-filesystems
                    modified: asset.mtime //timeUnit(asset.mtimeMs)
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
                size: sizeUnit(0),
                directory: dirname(path),
                created: undefined,
                modified: undefined,
                name: basename(path),
            })
            console.warn(`Could not read file '${path}'! ${exception.message}`)
        }
    }
    // if(files.length > 1 && (sources.length > 1 || (sources.length === 1 && hasFolder(sources[0])))) {
    //     return files // return an array of files when @sources contained more than one path, or when @sources had only one path but it was a directory
    // }
    // return files[0]
    return files
}


export const openFile = function(path, encoding) { // a convenience alias to `openFiles(path, encoding)[0]`
    assert(hasFile(path), `Malformed path '${path}'!`)
    return openFiles(path, encoding)?.[0] || null
}


export const readJson = function(src) {
    let path = null
    if(hasFile(src)) {
        path = src
        const file = openFile(path, "utf8")
        assert(type({object: file}) && file.content !== null && file.size?.value > 0, `Invalid JSON file '${path}'!`)
        src = JSON.parse(file.content)
    }
    assert(
        type({object: src}, {array: src}, {string: src}, {number: src}, {boolean: src}) || src === null,
        "Malformed JSON" + !path
            ? `:\n${JSON.stringify(src, null, "\t")}`
            : ` file '${path}'!`
    )
    if(type({object: src})) {
        return {...src}
    } else if(type({array: src})) {
        return [...src]
    }
    return src // string, number, boolean or null
}


export const readPlist = function(src, env = scope.env) {
    let path = null
    if(hasFile(src)) {
        path = src
        src = readJson(path)
    }
    assert(
        type({object: src}), // a property lists are always pairs of {"key": "value"}
        "Malformed PLIST" + !path
            ? `:\n${JSON.stringify(src, null, "\t")}`
            : ` file '${path}'!`
    )
    if(!type({nil: env})) { // if @env is null or undefined
        assert(
            Object.keys(src).some(prop => prop.startsWith(env)),
            `Missing environment '${env}' in PLIST` + !path
                ? `:\n${JSON.stringify(src, null, "\t")}`
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


export const executeSudoCommand = function(command, password, options) {
    const {success, stdout} = executeCommand(`echo "${password}" | sudo -S ${command}`, options)
    if(!success) {
        console.error(`Failed executing command '${command}' with admin permissions!`, stdout)
        return false
    }
    return true
}


export const executeScript = function(src) { // run shell command and throw on errors with message from stdout
    if(hasFile(src)) {
        src = openFile(src, "utf8").content
    }
    return assert(...Object.values(executeCommand(src)))
}


export default {
    sizeUnit,
    timeUnit,
    hasFolder,
    createFolder,
    deleteFolder,
    hasFile,
    createFile,
    openFiles,
    openFile,
    deleteFile,
    readJson,
    readPlist,
    createScript,
    createGitignore,
    changeFilePermissions,
    executeCommand,
    executeSudoCommand,
    executeScript
}
