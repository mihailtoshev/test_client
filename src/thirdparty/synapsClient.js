const BaseClient = require('../common/baseClient')

class SynapsClient extends BaseClient {
  constructor(params = {}) {
    super({ baseUrl: process.env.SYNAPS_BASE_URL, ...params })
    this.apiKey = params.apiKey || process.env.SYNAPS_API_KEY
  }

  getAuthorizationHeaders() {
    return {
      'Api-Key': process.env.NODE_ENV === 'test' ? 'invalidToken' : this.apiKey
    }
  }

  async listSessions(state) {
    return this.get(`/v2/session/list${state ? '' : `/${state}`}`)
  }

  async getSession(sessionId) {
    return this.get(`/v2/session/info`, { headers: { 'Session-Id': sessionId } })
  }

  async getVerificationProgress(sessionId) {
    return this.get('/v2/workflow/progress', { headers: { 'Session-Id': sessionId } })
  }

  async getVerificationFlowDetails(sessionId) {
    return this.get('/v2/workflow/details', { headers: { 'Session-Id': sessionId } })
  }

  async getEmailFromSession(sessionId) {
    return this.get('/v2/user/email', { headers: { 'Session-Id': sessionId } })
  }
}

module.exports = SynapsClient
