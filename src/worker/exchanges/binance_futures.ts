import Exchange from '../exchange'

export default class extends Exchange {
  id = 'BINANCE_FUTURES'
  private specs: { [pair: string]: number }
  private dapi: { [pair: string]: string }
  protected maxConnectionsPerApi = 100
  protected delayBetweenMessages = 100
  protected endpoints = {
    PRODUCTS: [
      'https://fapi.binance.com/fapi/v1/exchangeInfo',
      'https://dapi.binance.com/dapi/v1/exchangeInfo'
    ]
  }

  async getUrl(pair: string) {
    if (this.dapi[pair]) {
      return 'wss://dstream.binance.com/ws'
    } else {
      return 'wss://fstream.binance.com/ws'
    }
  }

  formatProducts(response) {
    const products = []
    const specs = {}
    const dapi = {}

    for (const data of response) {
      const type = ['fapi', 'dapi'][response.indexOf(data)]

      for (const product of data.symbols) {
        if (
          (product.contractStatus && product.contractStatus !== 'TRADING') ||
          (product.status && product.status !== 'TRADING')
        ) {
          continue
        }

        const symbol = product.symbol.toLowerCase()

        if (type === 'dapi') {
          dapi[symbol] = true
        }

        if (product.contractSize) {
          specs[symbol] = product.contractSize
        }

        products.push(symbol)
      }
    }

    return {
      products,
      specs,
      dapi
    }
  }

  getChannelPayload(pair: string, name: string) {
    if (name === 'ticker') {
      return [pair + '@miniTicker']
    }

    return [pair + '@aggTrade', pair + '@forceOrder']
  }

  /**
   * Sub
   * @param {WebSocket} api
   * @param {string} channel
   */
  async subscribe(api, channel) {
    if (!(await super.subscribe(api, channel))) {
      return
    }

    const [pair, name] = this.parseChannel(channel)

    api.send(
      JSON.stringify({
        method: 'SUBSCRIBE',
        ...this.getChannelPayload(pair, name)
      })
    )

    return true
  }

  /**
   * Unsub
   * @param {WebSocket} api
   * @param {string} channel
   */
  async unsubscribe(api, channel) {
    if (!(await super.unsubscribe(api, channel))) {
      return
    }

    const [pair, name] = this.parseChannel(channel)

    api.send(
      JSON.stringify({
        method: 'UNSUBSCRIBE',
        ...this.getChannelPayload(pair, name)
      })
    )

    return true
  }

  onMessage(api, event) {
    const json = JSON.parse(event.data)

    if (!json) {
      return
    } else {
      if (json.e === 'aggTrade' && json.X !== 'INSURANCE_FUND') {
        let size = +json.q

        const symbol = json.s.toLowerCase()

        if (typeof this.specs[symbol] === 'number') {
          size = (size * this.specs[symbol]) / json.p
        }

        return this.emitTrades(api.id, [
          {
            exchange: this.id,
            pair: symbol,
            timestamp: json.T,
            price: +json.p,
            size: size,
            side: json.m ? 'sell' : 'buy',
            count: json.l - json.f + 1
          }
        ])
      } else if (json.e === 'forceOrder') {
        let size = +json.o.q

        const symbol = json.o.s.toLowerCase()

        if (typeof this.specs[symbol] === 'number') {
          size = (size * this.specs[symbol]) / json.o.p
        }

        return this.emitLiquidations(api.id, [
          {
            exchange: this.id,
            pair: symbol,
            timestamp: json.o.T,
            price: +json.o.p,
            size: size,
            side: json.o.S === 'BUY' ? 'buy' : 'sell',
            liquidation: true
          }
        ])
      }
    }
  }
}
