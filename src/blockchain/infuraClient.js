const BaseClient = require('../common/baseClient')
const { NETWORKS, CURRENCIES } = require('./constants')

const NETWORK = {
  ...NETWORKS[CURRENCIES.ETH]
}

class InfuraClient extends BaseClient {
  constructor(params = {}) {
    let { baseUrl } = params
    const projectId = params.projectId || process.env.INFURA_PROJECT_ID

    if (!baseUrl) {
      switch (params.network) {
        case NETWORK.MAINNET:
        case NETWORK.GOERLI:
        case NETWORK.KOVAN:
        case NETWORK.RINKEBY:
        case NETWORK.ROPSTEN:
          baseUrl = `https://${params.network}.infura.io/v3/${projectId}`
          break
        default:
          throw new Error(`Unsupported network '${params.network}'`)
      }
    }

    super({ baseUrl, ...params })
    this.projectId = projectId
    this.requestId = 0
  }

  async parse(response) {
    const responseBody = await response.text()

    if (this.isJSON(responseBody)) return JSON.parse(responseBody)

    return responseBody
  }

  async parseResponse(response) {
    const res = await this.parse(response)

    // Status code is always 200, even for errors
    if (res.error) {
      throw new Error(res.error.message)
    }

    return res
  }

  async post(method, options = {}) {
    this.requestId += 1
    const { params } = options || []
    const body = {
      id: this.requestId,
      method,
      jsonrpc: '2.0',
      params
    }

    const { result } = await super.post('', { ...options, body })
    return result
  }

  getTransactionCount(address) {
    return this.post('eth_getTransactionCount', {
      params: [address, 'latest']
    })
  }

  sendRawTransaction(trx) {
    return this.post('eth_sendRawTransaction', {
      params: [trx]
    })
  }

  getGasPrice() {
    return this.post('eth_gasPrice', {
      params: []
    })
  }

  estimateGas({ to, from, gasPrice, value, data }) {
    return this.post('eth_estimateGas', {
      params: [{ to, from, gasPrice, value, data }]
    })
  }
}

InfuraClient.NETWORK = NETWORK
module.exports = InfuraClient
