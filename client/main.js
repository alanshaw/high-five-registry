var shoe = require('shoe')
var inject = require('reconnect-core')
var JSONStream = require('JSONStream')
var graph = require('./graph')

graph.create('#container', {}, function (er, chart) {
  if (er) throw er

  var series = {}
  var pointAdded = false

  var reconnect = inject(function () {
    return shoe.apply(null, arguments)
  })

  reconnect(function (stream) {
    stream.pipe(JSONStream.parse()).on('data', onData)
  }).connect('/sock')

  function onData (data) {
    pointAdded = true

    data.x = data.completedAt
    data.y = data.count

    var s = series[data.workshop]

    if (!s) {
      return series[data.workshop] = chart.addSeries({
        name: data.workshop,
        data: [data]
      })
    } else {
      s.addPoint(data, false, s.data.length > 20)
    }
  }

  setInterval(function () {
    if (pointAdded) {
      chart.redraw()
      pointAdded = false
    }
  }, 1000)
})