var http = require('http')
var bodyParser = require('body-parser').json()
var shoe = require('shoe')
var ecstatic = require('ecstatic')(__dirname + '/client')
var xtend = require('xtend')
var levelup = require('levelup')
var Counts = require('./Counts')

module.exports = function (opts, cb) {
  opts = xtend({
    port: process.env.PORT || 5000,
    dbPath: process.env.DB_PATH || __dirname + '/data'
  }, opts)

  cb = cb || function () {}

  var db = levelup(opts.dbPath, {valueEncoding: 'json'})
  var counts = new Counts
  var server = http.createServer(createRequestHandler(db, counts))

  // Build up cached counts data
  db.createValueStream()
    .on('data', function (data) {
      counts.increment(data.name, data.workshop, data.completedAt)
    })
    .on('end', function () {
      shoe(function (sockStream) {
        console.log('Client connected')

        var countsStream = counts.createReadStream()
        countsStream.pipe(sockStream)

        sockStream.once('close', function () {
          console.log('Client disconnected')
          countsStream.destroy()
        })
      }).install(server, '/sock')

      server.listen(opts.port, function (er) {
        cb(er, server)
      })
    })
}

function createRequestHandler (db, counts) {
  return function (req, res) {
    bodyParser(req, res, function () {
      ecstatic(req, res, function () {
        if (!req.body.name || !req.body.workshop || !req.body.completedAt) {
          res.statusCode = 400
          return res.end()
        }

        console.log('Got a new submission', req.body)

        var now = Date.now()
        var key = 'submission-' + req.body.completedAt + '-' + now
        var value = {
          name: req.body.name,
          workshop: req.body.workshop,
          completedAt: req.body.completedAt,
          registeredAt: now
        }

        db.put(key, value)
        counts.increment(value.name, value.workshop, value.completedAt)

        res.end()
      })
    })
  }
}
