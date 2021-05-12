const BaseClient = require('../common/baseClient')
const { NETWORKS, CURRENCIES } = require('./constants')

const NETWORK = {
  ...NETWORKS[CURRENCIES.BTC]
}

class BlockCypherClient extends BaseClient {
  constructor(params = {}) {
    let { baseUrl } = params

    if (!baseUrl) {
      switch (params.network) {
        case NETWORK.MAINNET:
          baseUrl = 'https://api.blockcypher.com/v1/btc/main'
          break
        case NETWORK.TESTNET:
          baseUrl = 'https://api.blockcypher.com/v1/btc/test3'
          break
        default:
          throw new Error('unsupported network')
      }
    }

    super({ baseUrl, ...params })
    this.apiKey = params.apiKey || process.env.BLOCKCYPHER_API_KEY
  }

  async parse(response) {
    const responseBody = await response.text()

    if (this.isJSON(responseBody)) return JSON.parse(responseBody)

    return responseBody
  }

  async parseResponse(response) {
    // Override to error on 4xx responses
    if (/^4/.test(response.status)) {
      const err = await this.parse(response)
      if (err.error) {
        throw new Error(err.error)
      }

      if (err.errors) {
        const msg = err.errors.reduce((acc, cur) => `${acc}${cur.error} `, '')
        throw new Error(msg)
      }

      throw new Error('Bad request')
    }

    return this.parse(response)
  }

  get(path, options = {}) {
    const body = options.body || {}
    const newBody = { ...body, token: this.apiKey }
    const newOptions = { ...options, noAuthHeader: true, body: newBody }
    return super.get(path, newOptions)
  }

  post(path, options = {}) {
    const url = new URL(path, this.baseUrl)
    url.searchParams.append('token', this.apiKey)
    return super.post(`${url.pathname}${url.search}`, options)
  }

  async getTransactions(address) {
    const { txs } = await this.get(`/addrs/${address}/full`)
    return txs
  }

  getTransaction(tx) {
    // Include raw tx for use in tx inputs.
    return this.get(`/txs/${tx}?includeHex=true`)
  }

  async generateTransaction({ inputs, outputs }) {
    const body = { inputs, outputs }
    const { tx } = await this.post('/txs/new', { body })
    return tx
  }

  async sendTransaction(trx) {
    const body = { tx: trx }
    const { tx } = await this.post('/txs/push', { body })
    return tx
  }

  getBlockchainData() {
    // General information about the blockchain
    const { blockchain } = await this.get(`/`)
    return blockchain
  }
}
BlockCypherClient.NETWORK = NETWORK
module.exports = BlockCypherClient
