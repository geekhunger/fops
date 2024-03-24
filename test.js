import test from "ava"
import fn from "./index.js"

import {join} from "path"
import rootpath from "app-root-path"
const filepath = rootpath.resolve("/node_modules/.tmp")


test("create gitignore", t => {
    fn.createGitignore(filepath, `
        # This is a demo
        # This folder does not exist
        /whatever/folders/**
    `)
})


test.skip("create file", t => {
    fn.createFile(join(filepath, "hello.txt"), "Hello World!")
})


test.skip("read file", t => {
    fn.openFile(join(filepath, "hello.txt"))
})


test.skip("create script", t => {
    fn.createScript(join(filepath, "echo.sh"), "echo 'Hello World!'")
})


test.skip("run script/command", t => {
    const cmd = "echo 'Hello World!'"
    console.log(fn.executeCommand(cmd))
    console.log(fn.executeScript(cmd)) // executeScript can do the same as executeCommand too
})
