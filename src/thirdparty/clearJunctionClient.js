const _ = require('lodash')
const crypto = require('crypto')
const BaseClient = require('../common/baseClient')

/* eslint-disable max-len */
// Token is sha512(uppercase(X-API-KEY) + Date + uppercase(sha512(password)) + uppercase(request body))
/* eslint-enable max-len */

class ClearJunctionClient extends BaseClient {
  constructor(params = {}) {
    super({ baseUrl: process.env.CLEAR_JUNCTION_API_URL, ...params })
    this.password = params.password || process.env.CLEAR_JUNCTION_PASSWORD
    this.apiKey = params.apiKey || process.env.X_API_KEY
    this.plutusWalletId = params.plutusWalletId || process.env.PLUTUS_WALLET_UUID
  }

  generateToken(jsonBody, timestamp) {
    if (_.isEmpty(jsonBody)) {
      return crypto
        .createHash('sha512')
        .update(
          this.apiKey.toUpperCase() +
            timestamp +
            crypto
              .createHash('sha512')
              .update(this.password)
              .digest('hex')
              .toUpperCase()
        )
        .digest('hex')
    }

    const concat =
      this.apiKey.toUpperCase() +
      timestamp +
      crypto
        .createHash('sha512')
        .update(this.password)
        .digest('hex')
        .toUpperCase() +
      jsonBody.toUpperCase()

    return crypto
      .createHash('sha512')
      .update(concat)
      .digest('hex')
  }

  getAuthorizationHeaders(requestBody = {}) {
    const timestamp = new Date().toISOString()

    return {
      Date: timestamp,
      'X-API-KEY': this.apiKey,
      Authorization:
        process.env.NODE_ENV === 'test' ? 'invalidToken' : `Bearer ${this.generateToken(requestBody, timestamp)}`
    }
  }

  async getStatusByClientOrder(id) {
    return this.get(`/v7/gate/status/walletTransfer/clientOrder/${id}`)
  }

  async getAdminAccountBalance() {
    return this.getWalletBalance(this.plutusWalletId)
  }

  async getWalletBalance(uuid, returnPaymentMethods = false) {
    return this.get(`/v7/bank/wallets/${uuid}`, {
      body: {
        returnPaymentMethods
      }
    })
  }

  async createWallet(body) {
    return this.post(`/v7/bank/wallets/${this.plutusWalletId}/individuals`, { body })
  }

  async getTransactionReport(body) {
    return this.post('/v7/gate/reports/transactionReport', { body })
  }

  async walletTransfer(body) {
    return this.post('/v7/gate/wallets/transfer', { body })
  }

  async getPayoutStatusByOrderId(id) {
    return this.get(`/v7/gate/status/payout/clientOrder/${id}`)
  }

  async getPayoutStatusByOrderReference(id) {
    return this.get(`/v7/gate/status/payout/orderReference/${id}`)
  }

  async getWalletTransferByOrderId(id) {
    return this.get(`/v7/gate/status/walletTransfer/clientOrder/${id}`)
  }

  async getWalletByOrderReference(id) {
    return this.get(`/v7/gate/status/walletTransfer/orderReference/${id}`)
  }

  async payoutEUR(options) {
    const { body } = options
    return this.post('/v7/gate/payout/bankTransfer/eu', { body })
  }

  async payoutSepaInstant(options) {
    const { body } = options
    return this.post('/v7/gate/payout/bankTransfer/sepaInst', { body })
  }

  async payoutGBP(options) {
    const { body } = options
    return this.post('/v7/gate/payout/bankTransfer/fps', { body })
  }

  async approveTransactions(...orderReferenceArray) {
    return this.post('/v7/gate/transactionAction/approve', {
      body: { orderReferenceArray }
    })
  }
}

module.exports = ClearJunctionClient
