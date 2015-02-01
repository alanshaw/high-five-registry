#!/usr/bin/env node

var config = require('rc')('high-five-registry')
var createServer = require('../')

console.log('Starting up...')

createServer(config, function (er, server) {
  if (er) throw er
  console.log('Ready!', server.address())
})
