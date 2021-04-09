const _ = require('lodash')
const BaseClient = require('../common/baseClient')
const { NETWORKS, CURRENCIES } = require('./constants')

const NETWORK = {
  ...NETWORKS[CURRENCIES.ETH]
}

class EtherscanClient extends BaseClient {
  constructor(params = {}) {
    let baseUrl
    switch (params.network) {
      case NETWORK.MAINNET:
        baseUrl = 'https://api.etherscan.io/api'
        break
      case NETWORK.GOERLI:
      case NETWORK.KOVAN:
      case NETWORK.RINKEBY:
      case NETWORK.ROPSTEN:
        baseUrl = `https://api-${params.network}.etherscan.io/api`
        break
      default:
        throw new Error('unsupported network')
    }
    super({ baseUrl, ...params })

    this.apiKey = params.apiKey || process.env.ETHERSCAN_API_KEY
    this.getBalance = this.getBalance.bind(this)
    this.getTransactions = this.getTransactions.bind(this)
    this.getTokenTransactions = this.getTokenTransactions.bind(this)
    this.getTokenBalance = this.getTokenBalance.bind(this)
    this.getTokenBalanceAtBlock = this.getTokenBalanceAtBlock.bind(this)
    this.getBlockNumberAtTimestamp = this.getBlockNumberAtTimestamp.bind(this)
  }

  async get(path, options = {}) {
    const newBody = { ..._.get(options, 'body', {}), ...{ apiKey: this.apiKey } }
    const newOptions = { ...options, ...{ noAuthHeader: true, body: newBody } }
    const resp = await super.get(path, newOptions)
    return resp.result
  }

  post(path, options = {}) {
    const newBody = { ..._.get(options, 'body', {}), ...{ apiKey: this.apiKey } }
    const newOptions = { ...options, ...{ noAuthHeader: true, body: newBody } }
    return super.post(path, newOptions)
  }

  getTokenTransactions(address, additionalParams = {}) {
    const body = {
      module: 'account',
      action: 'tokentx',
      startblock: 0,
      endblock: 999999999,
      sort: 'desc',
      address
    }
    return this.get('', { body: { ...body, ...additionalParams } })
  }

  // eslint-disable-next-line max-params
  getTokenBalanceAtBlock(walletAddress, contractAddress, blockNumbe, additionalParams = {}) {
    const body = {
      module: 'account',
      action: 'tokenbalancehistory',
      contractaddress: contractAddress,
      address: walletAddress,
      blockno: blockNumbe
    }
    return this.get('', { body: { ...body, ...additionalParams } })
  }

  getBlockNumberAtTimestamp(timestamp, closest = 'before', additionalParams = {}) {
    const body = {
      module: 'block',
      action: 'getblocknobytime',
      timestamp,
      closest
    }
    return this.get('', { body: { ...body, ...additionalParams } })
  }

  getTokenBalance(walletAddress, contractAddress, additionalParams = {}) {
    const body = {
      module: 'account',
      action: 'tokenbalance',
      contractaddress: contractAddress,
      address: walletAddress,
      tag: 'latest'
    }
    return this.get('', { body: { ...body, ...additionalParams } })
  }

  getBlockNumber(additionalParams = {}) {
    const body = {
      module: 'proxy',
      action: 'eth_blockNumber'
    }
    return this.get('', { body: { ...body, ...additionalParams } })
  }

  getBlockByHeight(height, additionalParams = {}) {
    const body = {
      module: 'proxy',
      action: 'eth_getBlockByNumber',
      tag: height.toString(16),
      boolean: true
    }
    return this.get('', { body: { ...body, ...additionalParams } })
  }

  getTransactionByHash(txhash, additionalParams = {}) {
    const body = {
      module: 'proxy',
      action: 'eth_getTransactionByHash',
      txhash
    }
    return this.get('', { body: { ...body, ...additionalParams } })
  }

  getTransactionReceipt(txhash, additionalParams = {}) {
    const body = {
      module: 'proxy',
      action: 'eth_getTransactionReceipt',
      txhash
    }
    return this.get('', { body: { ...body, ...additionalParams } })
  }

  getTransactions(address, additionalParams = {}) {
    const body = {
      module: 'account',
      action: 'txlist',
      startblock: 0,
      endblock: 999999999,
      sort: 'desc',
      address
    }
    return this.get('', { body: { ...body, ...additionalParams } })
  }

  getGasPrice(address, additionalParams = {}) {
    const body = {
      module: 'proxy',
      action: 'eth_gasPrice'
    }
    return this.get('', { body: { ...body, ...additionalParams } })
  }

  estimateGas(data, additionalParams = {}) {
    const body = {
      module: 'proxy',
      action: 'eth_estimateGas',
      data
    }
    return this.get('', { body: { ...body, ...additionalParams } })
  }

  getNonce(address, additionalParams = {}) {
    const body = {
      module: 'proxy',
      action: 'eth_getTransactionCount',
      tag: 'latest',
      address
    }
    return this.get('', { body: { ...body, ...additionalParams } })
  }

  getBalance(address, additionalParams = {}) {
    const body = {
      module: 'account',
      action: 'balance',
      tag: 'latest',
      address
    }
    return this.get('', { body: { ...body, ...additionalParams } })
  }
}

module.exports = EtherscanClient
