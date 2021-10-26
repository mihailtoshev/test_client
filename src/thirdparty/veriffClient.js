const crypto = require('crypto')
const BaseClient = require('../common/baseClient')

class VeriffClient extends BaseClient {
  constructor(params = {}) {
    super({ baseUrl: process.env.VERIFF_API_URL, ...params })
    this.apiKey = params.apiKey || process.env.VERIFF_API_KEY
    this.apiSecret = params.apiSecret || process.env.VERIFF_API_SECRET
  }

  /**
   * @param {string} payload - usually stringified request payload
   * @returns string
   */
  async generateSignature(payload) {
    let data = payload

    if (data instanceof Object) {
      data = JSON.stringify(data)
    }

    if (!(data instanceof Buffer)) {
      data = Buffer.from(data, 'utf8')
    }

    return crypto
      .createHash('sha256')
      .update(data)
      .update(Buffer.from(this.apiSecret, 'utf8'))
      .digest('hex')
  }

  async getAuthorizationHeaders(requestBody = {}, providedSignature = null) {
    let signature = providedSignature

    if (!signature) {
      signature = await this.generateSignature(requestBody)
    }

    return {
      'x-auth-client': this.apiKey,
      'x-signature': signature
    }
  }

  async createSession(body) {
    return this.post('/sessions', { body })
  }

  async createSession2(body) {
    return this.post('/sessions', { body })
  }

  async getPerson(session) {
    const signature = await this.generateSignature(session)

    return this.get(`/sessions/${session}/person`, { signature })
  }

  async getMediaForUser(sessionId) {
    const signature = await this.generateSignature(sessionId)

    return this.get(`/sessions/${sessionId}/media`, { signature })
  }

  async getMedia(mediaId) {
    const signature = await this.generateSignature(mediaId)
    
    return this.get(`/media/${mediaId}`, { signature })
  }
}

module.exports = VeriffClient
