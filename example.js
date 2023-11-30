import {catfile, mkfile, mkscript, mkgitignore, runscript, exec} from "./index.js"

mkgitignore("./foobar", `
    #test
    /whatever/**
`)

catfile("./lol")

mkfile("./foobar/test.txt", "hello world!")

const cmd = "echo 'hello world'"
mkscript("./foobar/echo.sh", cmd)
console.log(runscript(cmd))
console.log(exec(cmd))
