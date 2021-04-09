const BaseClient = require('../common/baseClient')

class AuthServiceClient extends BaseClient {
  constructor(params = {}) {
    super(params)
  }

  async mfaVerify(options) {
    return this.post('/mfa/verify/', options)
  }

  async mfaEnable(options) {
    return this.get('/mfa/enable/', options)
  }

  async mfaDisable(options) {
    return this.get('/mfa/disable/', options)
  }

  async emailVerify(token, options) {
    return this.get(`/email/verify/${token}`, options)
  }

  async emailSendVerification(options) {
    return this.get('/email/send/verify', options)
  }

  async emailChange(options) {
    return this.post('/email/change/', options)
  }

  async login(options) {
    return this.post('/auth/login/', options)
  }

  async logout(options) {
    return this.post('/auth/logout/', options)
  }

  async signup(options) {
    return this.post('/auth/sign-up/', options)
  }

  async refreshToken(options) {
    return this.post('/auth/refresh-token/', options)
  }

  async passwordResetVerify(token, options) {
    return this.post(`/password/reset/verify/${token}`, options)
  }

  async passwordReset(options) {
    return this.get('/password/reset/', options)
  }

  async passwordChange(options) {
    return this.post('/password/change/', options)
  }
}

module.exports = AuthServiceClient
