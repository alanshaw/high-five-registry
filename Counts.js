var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var xtend = require('xtend')
var Readable = require('stream').Readable

function Counts () {
  this._counts = {}
}
inherits(Counts, EventEmitter)

Counts.prototype.increment = function (name, workshop, completedAt) {
  var counts = this._counts[workshop] = this._counts[workshop] || []
  var last = counts[counts.length - 1] || {count: 0}

  counts.push({
    name: name,
    workshop: workshop,
    completedAt: completedAt,
    count: last.count + 1
  })
  this.emit('increment', xtend(counts[counts.length - 1]))
}

// Create a readable stream that never ends
Counts.prototype.createReadStream = function () {
  var readable = new Readable()

  var buffer = Object.keys(this._counts).reduce(function (buf, workshop) {
    buf.push.apply(buf, this._counts[workshop])
    return buf
  }.bind(this), [])

  var pushOnNext = false

  readable._read = function () {
    if (!buffer.length) return pushOnNext = true
    this.push(JSON.stringify(buffer.shift()))
  }

  function onIncrement (count) {
    if (pushOnNext) {
      readable.push(JSON.stringify(count))
    } else {
      buffer.push(count)
    }
  }

  this.on('increment', onIncrement)

  readable.destroy = function () {
    this.removeListener('increment', onIncrement)
    readable.push(null)
  }.bind(this)

  return readable
}

module.exports = Counts