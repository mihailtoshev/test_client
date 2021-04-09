const BaseClient = require('../common/baseClient')

class SubscriptionsServiceClient extends BaseClient {
  constructor(params = {}) {
    super(params)
  }

  async getCard(options) {
    return this.get('/payments/card/', options)
  }
}

module.exports = SubscriptionsServiceClient
