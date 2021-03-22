// import { program } from 'commander'
const fs = require('fs')
const { parseBalanceMap } = require("../helpers/parse-balance-map")

const json = JSON.parse(fs.readFileSync("./data/example.json", { encoding: 'utf8' }))

if (typeof json !== 'object') throw new Error('Invalid JSON')
fs.writeFileSync("./data/claims.json", JSON.stringify(parseBalanceMap(json)), { encoding: 'utf8' })
