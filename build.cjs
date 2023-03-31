const vite = require('vite')
const fs = require('fs')

;(async function () {
    await vite.build()
    fs.renameSync('notegpt/main.cjs', 'notegpt/main.js')
})()
