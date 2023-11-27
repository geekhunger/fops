import {mkfile, mkscript, runscript, exec} from "./index.js"

mkfile("./foobar/test.txt", "hello world!")

const cmd = "echo 'hello world'"
mkscript("./foobar/echo.sh", cmd)
console.log(runscript(cmd))
console.log(exec(cmd))
