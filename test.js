const fops = require("./index")

const folder = "foo"
const file = "bar.txt"
const path = folder + "/" + file

console.log(fops.mkfile(path, "hello world\n", "a", 644))

const testfile = fops.catfile(path)[0]  // NOTE: return value is an array

console.log("file:", testfile)
console.log("filename:", testfile.name)
console.log("ASCII:", testfile.content.toString("ascii").trim())
console.log("Base64:", testfile.content.toString("base64"))

console.log(fops.rmfile(file))
console.log(fops.rmfolder(folder))


const mb = fops.unitsize()
mb.megabyte = 1
console.log(mb)
console.log(mb.byte)

