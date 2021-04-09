const BaseClient = require('../common/baseClient')

class DexAdminClient extends BaseClient {
  constructor(params = {}) {
    super({ baseUrl: process.env.DEX_ADMIN_POD_URL, ...params })
  }

  async greylistConsumer(userId, reason = 'Greylisted by Contis', options = {}) {
    const body = { reason }
    return this.post(`/v1/action/suspend/user/${userId}`, { body, ...options })
  }
}

module.exports = DexAdminClient
