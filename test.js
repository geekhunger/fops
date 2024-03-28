import test from "ava"
import {resolve, relative, join, sep} from "path"
import * as fn from "./index.js"
import rootpath from "app-root-path"


test.serial("path sandboxing", t => {
    t.assert(fn.absoluteSandboxPath(/*undefined*/) === rootpath.toString())
    t.assert(fn.absoluteSandboxPath(null) === rootpath.toString())
    t.log("without arguments, sandbox environment equals to project folder")
    t.assert(fn.absoluteSandboxPath("/tmp/foo/bar") === rootpath.resolve("tmp/foo/bar"))
    t.log("can move deeper inside sandbox environment")
    t.assert(fn.absoluteSandboxPath("../../tmp") === rootpath.resolve("tmp"))
    t.assert(fn.absoluteSandboxPath("./../.tmp") === rootpath.resolve(".tmp"))
    t.assert(fn.absoluteSandboxPath(rootpath.resolve("../../.foo/bar")) === rootpath.resolve(".foo/bar"))
    t.log("can not escape out of sandbox environment")
})


test.serial("file type recognition", t => {
    t.throws(() => fn.hasFolder(fn.absoluteSandboxPath("foo/bar/baz")))
    t.throws(() => fn.hasFile(fn.absoluteSandboxPath("foo/bar.baz")))
    t.log("asserts on missing paths")
    t.true(fn.hasFolder(fn.absoluteSandboxPath("node_modules")))
    t.true(fn.hasFile(fn.absoluteSandboxPath("index.js")))
    t.log("succeeds on existing paths")
})


test("folder operations", t => {
    const crud = dir => {
        const working_directory = fn.absoluteSandboxPath()
        const subfolders = dir.split("/")
        const parent_directory = dir.slice(0, dir.indexOf(sep, 2))
        const contains_dotnames = subfolders.some(folder => folder.startsWith("."))
        const within_sandbox = relative(working_directory, resolve(working_directory, dir)).match(/^\.*[\\\/]/) === null

        t.log("crud: " + dir, parent_directory)

        // t.notThrows(() => fn.createFolder(dir, false, true))
        // t.true(fn.hasFolder(dir))
        // t.notThrows(() => fn.deleteFolder(parent_directory))
        // t.false(fn.hasFolder(parent_directory))
        // t.log("\tcreation works (un)sandboxed")

        // if(!within_sandbox) {
        //     t.throws(() => fn.createFolder(dir, true, true))
        //     t.false(fn.hasFolder(dir))
        //     t.log("\tsandbox restrictions get respected")
        // }

        // if(contains_dotnames) {
        //     t.throws(() => fn.createFolder(dir, false, false))
        //     t.false(fn.hasFolder(dir))
        //     t.log("\tdotname restrictions get respected")
        // }
        
        return t.pass("ok")
    }

    let paths = [
        "./.foobarbaz/hello/.world",
        "./.foobarbaz/.hello/world",
        "./.foobarbaz",
        "foobarbaz",
        "foobarbaz/hello/world",
        "foobarbaz/.hello/world",
        "foobarbaz/hello/.world",
    ]

    for(let path of paths) {
        t.notThrows(() => crud(path))
    }
})


test.skip("file operations", t => {
    t.true(fn.hasFile("./index.js"))
    fn.createFile(join(filepath, "hello.txt"), "Hello World!")
    fn.openFile(join(filepath, "hello.txt"))
})


test.skip("script", t => {
    fn.createScript(join(filepath, "echo.sh"), "echo 'Hello World!'")
    const cmd = "echo 'Hello World!'"
    console.log(fn.executeCommand(cmd))
    console.log(fn.executeScript(cmd)) // executeScript can do the same as executeCommand too
})


test.skip("gitignore interactions", t => {
    fn.createGitignore(filepath, `
        # This is a demo
        # This folder does not exist
        /whatever/folders/**
    `)
})
