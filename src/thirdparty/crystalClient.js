const BaseClient = require('../common/baseClient')

class CrystalClient extends BaseClient {
  constructor(params = {}) {
    super({ baseUrl: process.env.CRYSTAL_BASE_URL, ...params })
    this.apiKey = params.apiKey || process.env.CRYSTAL_API_KEY
  }

  getAuthorizationHeaders() {
    return {
      'X-Auth-Apikey': process.env.NODE_ENV === 'test' ? 'invalidToken' : this.apiKey
    }
  }

  async getCustomer(id) {
    return this.get(`/monitor/one/${id}`)
  }

  async getCustomerAddresses(id) {
    return this.get(`/monitor/one/${id}/addresses`)
  }

  async createCustomer(body) {
    return this.post('/monitor/one', { body })
  }

  async updateCustomer(id, body) {
    return this.post(`/monitor/one/${id}`, { body })
  }

  async listCustomers() {
    return this.get('/monitor/list')
  }

  async createTransaction(body) {
    return this.post('/monitor/tx/add', { body })
  }

  async updateTransaction(id, body) {
    return this.post(`/monitor/tx/${id}/update`, { body })
  }
}

module.exports = CrystalClient
