import test from "ava"
import fn from "./index.js"

import {join} from "path"
import rootpath from "app-root-path"

const filepath = rootpath.resolve("/node_modules/.tmp")


test.serial("crud folder", t => {
    if(fn.hasFolder(filepath)) {
        fn.deleteFolder(filepath)
        t.false(fn.hasFolder(filepath), "Folder deletion failed!")
    }

    t.log("createFolder return value", fn.createFolder(filepath))
    t.true(fn.hasFolder(filepath), "Folder creation failed!")

    const path = "/tmp/foobar"
    fn.createFolder(path, true)
    t.false(fn.hasFolder(path), "Folder creation outside of sandbox!")
})


test.skip("create file", t => {
    fn.createFile(join(filepath, "hello.txt"), "Hello World!")
})


test.skip("read file", t => {
    fn.openFile(join(filepath, "hello.txt"))
})


test.skip("create gitignore", t => {
    fn.createGitignore(filepath, `
        # This is a demo
        # This folder does not exist
        /whatever/folders/**
    `)
})


test.skip("create script", t => {
    fn.createScript(join(filepath, "echo.sh"), "echo 'Hello World!'")
})


test.skip("run script/command", t => {
    const cmd = "echo 'Hello World!'"
    console.log(fn.executeCommand(cmd))
    console.log(fn.executeScript(cmd)) // executeScript can do the same as executeCommand too
})
