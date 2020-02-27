'use strict'

const PI = require('p-iteration')
const runExample = require('../util/run_example')

const TABLE_DEF = {
  headers: ['Symbol', 'Status', 'Amount', 'Base Price', 'Liq Price', 'P/L']
}

module.exports = runExample({
  name: 'rest-close-positions',
  rest: { env: true, transform: true },
  ws: { env: true, transform: true, connect: true, auth: true }
}, async ({ debug, debugTable, rest, ws }) => {
  const positions = await rest.positions()

  if (positions.length === 0) {
    debug('no open positions')
    return ws.close()
  }

  debug(
    'found %d open positions on market(s) %s\n', positions.length,
    positions.map(({ symbol }) => symbol).join(',')
  )

  debugTable(TABLE_DEF, positions.map(p => ([
    p.symbol, p.status, p.amount, p.basePrice, p.liqPrice, p.pl
  ])))

  const orders = positions.map(p => p.orderToClose(ws))

  debug('submitting:')
  orders.forEach(o => (debug('%s', o.toString())))
  debug('')

  ws.onOrderClose({}, ({ id, symbol }) => {
    debug('received confirmation of order %d closed on %s', id, symbol)
  })

  await PI.forEachSeries(orders, o => o.submit())
  await ws.close()

  debug('')
  debug('closed %d positions', positions.length)
})
