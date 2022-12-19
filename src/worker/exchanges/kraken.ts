import Exchange from '../exchange'

export default class extends Exchange {
  id = 'KRAKEN'
  private specs: { [pair: string]: number }

  protected endpoints = {
    PRODUCTS: [
      'https://api.kraken.com/0/public/AssetPairs',
      'https://futures.kraken.com/derivatives/api/v3/instruments'
    ]
  }

  async getUrl(pair: string) {
    if (typeof this.specs[pair] !== 'undefined') {
      return 'wss://futures.kraken.com/ws/v1'
    } else {
      return 'wss://ws.kraken.com/'
    }
  }

  formatProducts(response) {
    const products = []
    const specs = {}

    for (const data of response) {
      if (data.instruments) {
        for (const product of data.instruments) {
          if (!product.tradeable) {
            continue
          }

          const pair = product.symbol.toUpperCase()

          specs[pair] = product.contractSize

          products.push(pair)
        }
      } else if (data.result) {
        for (const id in data.result) {
          if (data.result[id].wsname) {
            products.push(data.result[id].wsname)
          }
        }
      }
    }

    return {
      products,
      specs
    }
  }

  getChannelPayload(pair: string, name: string) {

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


    const event: any = {
      event: 'subscribe'
    }

    if (typeof this.specs[pair] !== 'undefined') {
      // futures contract
      event.product_ids = [pair]
      event.feed = 'trade'
    } else {
      // spot
      event.pair = [pair]
      event.subscription = {
        name: 'trade'
      }
    }

    api.send(JSON.stringify(event))

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


    const event: any = {
      event: 'unsubscribe'
    }

    if (typeof this.specs[pair] !== 'undefined') {
      // futures contract
      event.product_ids = [pair]
      event.feed = 'trade'
    } else {
      // spot
      event.pair = [pair]
      event.subscription = {
        name: 'trade'
      }
    }

    api.send(JSON.stringify(event))

    return true
  }

  onMessage(api, event) {
    const json = JSON.parse(event.data)

    if (!json || json.event === 'heartbeat') {
      return
    }

    if (json.feed === 'trade' && json.qty) {
      // futures

      return this.emitTrades(api.id, [
        {
          exchange: this.id,
          pair: json.product_id,
          timestamp: json.time,
          price: json.price,
          size: json.qty / json.price,
          side: json.side
        }
      ])
    } else if (json[1] && json[1].length) {
      // spot

      return this.emitTrades(
        api.id,
        json[1].map(trade => ({
          exchange: this.id,
          pair: json[3],
          timestamp: trade[2] * 1000,
          price: +trade[0],
          size: +trade[1],
          side: trade[3] === 'b' ? 'buy' : 'sell'
        }))
      )
    }

    return false
  }

  onApiCreated(api) {
    if (/futures/.test(api.url)) {
      this.startKeepAlive(api)
    }
  }

  onApiRemoved(api) {
    if (/futures/.test(api.url)) {
      this.stopKeepAlive(api)
    }
  }
}
