const _ = require('lodash')
const BaseClient = require('../common/baseClient')

class ComplyAdvantageClient extends BaseClient {
  constructor(options = {}) {
    super({ baseUrl: process.env.CA_URL, ...options })

    this.username = options.username || process.env.CA_USERNAME
    this.password = options.password || process.env.CA_PASSWORD
    this.retryStrategy = this.complyAdvantageClientRetryStrategy
  }

  async getAuthorizationHeaders() {
    if (_.isEmpty(this.token)) {
      await this.login()
    }

    return this.getHeaders()
  }

  getHeaders() {
    return {
      Authorization: `Token ${this.token}`
    }
  }

  async login(options) {
    const response = await this.post('/external/token-auth', {
      body: {
        username: this.username,
        password: this.password
      },
      ...options,
      // Important to not include auth headers. Otherwise "Maximum call stack size exceeded"
      noAuthHeader: true
    })
    this.token = response.token
  }

  async complyAdvantageClientRetryStrategy({ err, response, options }) {
    if (this.isHTTPOrNetworkError({ err, response, options })) {
      if (response && response.status === 401) {
        await this.login()

        return {
          headers: await this.getAuthorizationHeaders(),
          ...options
        }
      }
      return true
    }
    return false
  }

  async sendTransaction(transactionData, options) {
    const body = {
      data: {
        type: 'RealtimeTransaction',
        id: transactionData.tx_id,
        attributes: {
          transaction_data: transactionData,
          source_format_name: 'Plutus'
        }
      }
    }

    return this.post('/external/transactions', {
      body,
      headers: { Accept: null },
      ...options
    })
  }

  async sendExportUrl(url, options) {
    const body = {
      data: {
        type: 'DataSource',
        attributes: {
          name: url
        }
      }
    }

    return this.post('/external/datasource-results/export', {
      body,
      headers: { Accept: null },
      ...options
    })
  }

  async getExportStatus(exportId) {
    return this.get(`/external/datasource-results/${exportId}`, { headers: { Accept: null } })
  }

  async getProcessedTransactions() {
    return this.get(`/external/datasource-results`, { headers: { Accept: null } })
  }
}

module.exports = ComplyAdvantageClient
