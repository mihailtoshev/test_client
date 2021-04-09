/* eslint-disable no-underscore-dangle */
const _ = require('lodash')
const crypto = require('crypto')
const moment = require('moment')
const querystring = require('querystring')
const BaseClient = require('../common/baseClient')
const { prettyContisErrors } = require('../common/errors')

class ContisClient extends BaseClient {
  constructor(params) {
    super({ baseUrl: process.env.CONTIS_API_URL, ...params })

    const { username, password, cardDesignCode, withResponseLogging } = params

    this.retryStrategy = this.contisClientRetryStrategy
    this.username = username || process.env.CONTIS_API_USERNAME
    this.password = password || process.env.CONTIS_API_PASSWORD
    this.cardDesignCode = cardDesignCode || process.env.CONTIS_CARD_DESIGN_CODE
    if (withResponseLogging && {}.toString.call(withResponseLogging) !== '[object Function]') {
      throw new Error('withResponseLogging must be a function')
    }
    this.withResponseLogging = withResponseLogging
    this._getBalance = this._getBalance.bind(this)
    this._getConsumer = this._getConsumer.bind(this)
    this._setCardBlocked = this._setCardBlocked.bind(this)
    this._setCardLostWithReplacement = this._setCardLostWithReplacement.bind(this)
    this._setCardNormal = this._setCardNormal.bind(this)
    this._listCards = this._listCards.bind(this)
    this._listTransactions = this._listTransactions.bind(this)
    this._listPendingTransactions = this._listPendingTransactions.bind(this)
    this._changeTerms = this._changeTerms.bind(this)
    this._chargeFee = this._chargeFee.bind(this)
    this._getTerms = this._getTerms.bind(this)
    this._loadConsumerAccount = this._loadConsumerAccount.bind(this)
    this._unloadConsumerAccount = this._unloadConsumerAccount.bind(this)
    this._updateCosnumerContactDetails = this._updateCosnumerContactDetails.bind(this)
    this._updateConsumerDetail = this._updateConsumerDetail.bind(this)
    this._listCardTransactions = this._listCardTransactions.bind(this)
  }

  async decode(encryptedText) {
    if (_.isEmpty(this.securityKey)) {
      await this.login()
    }

    const iv = Buffer.from(this.securityKey.slice(0, 32), 'hex')
    const key = Buffer.from(this.securityKey.slice(32, 96), 'hex')
    // Decrypting
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encryptedText, 'base64', 'utf16le')
    decrypted += decipher.final('utf16le')
    return decrypted
  }

  async encode(value) {
    if (_.isEmpty(this.securityKey)) {
      await this.login()
    }

    const iv = Buffer.from(this.securityKey.slice(0, 32), 'hex')
    const key = Buffer.from(this.securityKey.slice(32, 96), 'hex')
    // Encrypting
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(value.toString(), 'utf16le', 'base64')
    encrypted += cipher.final('base64')
    return encrypted
  }

  async getAuthorizationHeaders() {
    if (_.isEmpty(this.token)) {
      await this.login()
    }

    return this.getHeaders()
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${this.token}`
    }
  }

  async parse(response) {
    const responseBody = await response.text()
    if (this.withResponseLogging) {
      this.withResponseLogging(responseBody)
    }

    if (this.isJSON(responseBody)) return JSON.parse(responseBody)

    return responseBody
  }

  async parseResponse(response) {
    if (/^4/.test(response.status)) {
      prettyContisErrors(await this.parse(response))
    }

    return this.parse(response)
  }

  async contisClientRetryStrategy({ err, response, options }) {
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

  async login() {
    const response = await this.post('/Security/login', {
      // Important to not include auth headers. Otherwise "Maximum call stack size exceeded"
      noAuthHeader: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: querystring.stringify({
        GRANT_TYPE: 'password',
        UserName: this.username,
        Password: this.password
      })
    })

    this.token = response.access_token
    this.securityKey = response.Contis_SecurityKey
  }

  async logout() {
    return this.post('/Security/logout', {})
  }

  async postLoginDecorator(func, options) {
    let consumerId = null
    const {
      params: { consumerId: consumerIdAsParam, ConsumerID: consumerIdAsParamTwo, accountNumber, sortCode }
    } = options
    const {
      CONTIS_GBP_ESCROW_ACCOUNT_NUMBER: gbpAccountNumber,
      CONTIS_GBP_ESCROW_SORT_CODE: gbpSortCode,
      CONTIS_GBP_ESCROW_CONSUMER_ID: gbpConsumerID,
      CONTIS_EUR_ESCROW_SORT_CODE: eurSortCode,
      CONTIS_EUR_ESCROW_ACCOUNT_NUMBER: eurAccountNumber,
      CONTIS_EUR_ESCROW_CONSUMER_ID: eurConsumerId
    } = process.env

    if (consumerIdAsParamTwo || consumerIdAsParam) {
      consumerId = consumerIdAsParamTwo || consumerIdAsParam
    } else if (gbpAccountNumber === accountNumber && gbpSortCode === sortCode) {
      consumerId = gbpConsumerID
    } else if (eurAccountNumber === accountNumber && eurSortCode === sortCode) {
      consumerId = eurConsumerId
    }

    let response
    try {
      response = await func(options)
    } catch (e) {
      const isSessionExpiredError = _.get(e, 'errors[0].status', false) === '0387'

      if (isSessionExpiredError && consumerId) {
        await this.postLoginDetails(consumerId)
        return func(options)
      }
      throw e
    }
    return response
  }

  async postLoginDetails(consumerId, options) {
    const body = {
      ConsumerID: consumerId,
      SCAOptionID1FA: 6, // means password
      SCAOptionID2FA: 4 // means OTP
    }
    return this.post('/Security/PostLoginDetails', { body, ...options })
  }

  async _listCards({ params, options }) {
    const body = {
      AccountNumber: params.accountNumber,
      SortCode: params.sortCode
    }

    return this.post('/card/ListCards', {
      body,
      ...options
    })
  }

  async listCards(accountNumber, sortCode, consumerId, options) {
    return this.postLoginDecorator(this._listCards, { params: { accountNumber, sortCode, consumerId }, options })
  }

  async activateCard(cardId, dob, cvv, options) {
    const body = {
      CardID: cardId,
      DOB: moment(dob).format('YYYY-MM-DD'),
      EncryptedCVV: await this.encode(cvv)
    }
    return this.post('/card/ActivateCard', {
      body,
      ...options
    })
  }

  async _setCardBlocked({ params, options }) {
    const body = {
      CardID: params.cardId,
      ConsumerID: params.consumerId
    }
    return this.post('/card/SetCardAsBlock', {
      body,
      ...options
    })
  }

  async setCardBlocked(cardId, consumerId, options) {
    return this.postLoginDecorator(this._setCardBlocked, { params: { consumerId, cardId }, options })
  }

  async _setCardNormal({ params, options }) {
    const body = {
      CardID: params.cardId,
      ConsumerID: params.consumerId
    }
    return this.post('/card/SetCardAsNormal', {
      body,
      ...options
    })
  }

  async setCardNormal(cardId, consumerId, options) {
    return this.postLoginDecorator(this._setCardNormal, { params: { consumerId, cardId }, options })
  }

  async _setCardLostWithReplacement({ params, options }) {
    const body = {
      CardID: params.cardId,
      ConsumerID: params.consumerId
    }

    return this.post('/card/SetCardAsLostWithReplacement', {
      body,
      ...options
    })
  }

  async setCardLostWithReplacement(cardId, consumerId, options) {
    return this.postLoginDecorator(this._setCardLostWithReplacement, { params: { consumerId, cardId }, options })
  }

  async showCard(cardId, options) {
    const body = {
      CardID: cardId
    }

    return this.post('/card/GetSpecificCard', {
      body,
      ...options
    })
  }

  async viewCardPin(cardId, dob, cvv, options) {
    if (!moment(dob, 'YYYY-MM-DD', true).isValid()) {
      throw new Error('dob argument has an invalid format')
    }

    const body = {
      CardID: cardId,
      DOB: moment(dob).format('YYYY-MM-DD'),
      EncryptedCVV: await this.encode(cvv)
    }

    const response = await this.post('/card/ViewPin', {
      body,
      ...options
    })

    return { ...response, Pin: await this.decode(response.EncryptedPin) }
  }

  createContisConsumer(params) {
    const { cardDesignCode } = this
    return {
      // 9 means Other
      Title: 9,
      FirstName: params.firstName,
      LastName: params.lastName,
      Gender: 'U',
      DOB: params.dateOfBirth,
      Relationship: 1,
      IsPrimaryConsumer: true,
      CardDesignCode: cardDesignCode,
      IsLoginRequired: false,
      IsTitleRequired: false,
      IsSkipKYC: true,
      IsSkipSanctionCheck: true,
      IsSkipCardIssuance: false,
      MobileNumber: params.phoneNumber,
      MobileNumberISOCountryCode: params.mobileNumberISOCode,
      PresentAddress: {
        ISOCountryCode: params.countryISOCode,
        Postcode: params.postcode,
        Town: params.city,

        // Required
        Street: ' ',

        // Required
        // Street contains BuildingNo
        BuildingNo: ' ',
        AddressLine1: params.addressLine1,
        AddressLine2: params.addressLine2
      }
    }
  }

  async _getConsumer({ params, options }) {
    const { consumerId } = params
    return this.post('/consumer/GetSpecificConsumer', {
      body: {
        ConsumerID: consumerId
      },
      ...options
    })
  }

  async getConsumer(consumerId, options) {
    return this.postLoginDecorator(this._getConsumer, { params: { consumerId }, options })
  }

  async addConsumer(params, options) {
    const body = {
      ConsumerReqList: [this.createContisConsumer(params)],
      AgreementCode: params.agreementCode,
      Language: 1
    }

    return this.post('/consumer/AddConsumers', {
      body,
      ...options
    })
  }

  async updateCosnumerContactDetails(params, options) {
    return this.postLoginDecorator(this._updateCosnumerContactDetails, { params, options })
  }

  async _updateCosnumerContactDetails({ params, options }) {
    return this.post('/consumer/UpdateConsumerContactDetails', {
      body: params,
      ...options
    })
  }

  async updateConsumerDetail(params, options) {
    return this.postLoginDecorator(this._updateConsumerDetail, { params, options })
  }

  async _updateConsumerDetail({ params, options }) {
    return this.post('/consumer/UpdateConsumerDetail', {
      body: params,
      ...options
    })
  }

  async _loadConsumerAccount({ params, options }) {
    const body = {
      Amount: params.amount,
      Description: params.description,
      AccountNumber: params.accountNumber,
      SortCode: params.sortCode
    }

    return this.post('/account/LoadConsumerAccount', {
      body,
      ...options
    })
  }

  async loadConsumerAccount(params, options) {
    return this.postLoginDecorator(this._loadConsumerAccount, { params, options })
  }

  async _unloadConsumerAccount({ params, options }) {
    const body = {
      Amount: params.amount,
      Description: params.description,
      ReferenceNumber: params.reference_number,
      ClientReferenceNumber: params.client_reference_number,
      AccountNumber: params.accountNumber,
      SortCode: params.sortCode
    }

    return this.post('/account/UnloadConsumerAccount', {
      body,
      ...options
    })
  }

  async unloadConsumerAccount(params, options) {
    return this.postLoginDecorator(this._unloadConsumerAccount, { params, options })
  }

  async _getBalance({ params, options }) {
    const body = {
      AccountNumber: params.accountNumber,
      SortCode: params.sortCode
    }

    return this.post('/account/GetBalance', {
      body,
      ...options
    })
  }

  async getBalance(params, options) {
    return this.postLoginDecorator(this._getBalance, { params, options })
  }

  async _listCardTransactions({ params, options }) {
    const body = {
      CardID: params.cardId,
      FromDate: params.from,
      ToDate: params.to,
      RowIndex: params.rowIndex,
      Pagesize: params.pageSize || 50
    }

    return this.post('/Card/ListTransactions', {
      body,
      ...options
    })
  }

  async listCardTransactions(from, to, rowIndex, settings, options) {
    return this.postLoginDecorator(this._listCardTransactions, {
      params: {
        ...settings,
        from,
        to,
        rowIndex
      },
      options
    })
  }

  async _listTransactions({ params, options }) {
    const body = {
      FromDate: params.from,
      ToDate: params.to,
      RowIndex: params.rowIndex,
      Pagesize: params.pageSize || 50,
      AccountNumber: params.accountNumber,
      SortCode: params.sortCode
    }

    return this.post('/account/ListTransactions', {
      body,
      ...options
    })
  }

  async listTransactions(from, to, rowIndex, settings, options) {
    return this.postLoginDecorator(this._listTransactions, {
      params: {
        consumerId: settings.consumerId,
        accountNumber: settings.accountNumber,
        sortCode: settings.sortCode,
        pageSize: settings.pageSize,
        from,
        to,
        rowIndex
      },
      options
    })
  }

  async _listPendingTransactions({ params, options }) {
    const body = {
      AccountNumber: params.accountNumber,
      SortCode: params.sortCode
    }

    return this.post('/account/ListPendingAuthorizations', {
      body,
      ...options
    })
  }

  async listPendingTransactions(params, options) {
    return this.postLoginDecorator(this._listPendingTransactions, { params, options })
  }

  async _chargeFee({ params, options }) {
    const body = {
      Amount: params.amount,
      ReferenceNumber: params.reference,
      AccountNumber: params.accountNumber,
      SortCode: params.sortCode,
      ClientReferenceNumber: params.clientReferenceNumber,
      ClientRequestReference: params.clientRequestReference
    }

    return this.post('/account/ChargeFee', {
      body,
      ...options
    })
  }

  async chargeFee(params, options) {
    return this.postLoginDecorator(this._chargeFee, { params, options })
  }

  async _getTerms({ params, options }) {
    const body = {
      AgreementCode: params.agreementCode,
      AccountNumber: params.accountNumber,
      SortCode: params.sortCode
    }

    return this.post('/account/GetSpecificTerms', {
      body,
      ...options
    })
  }

  async getTerms(params, options) {
    return this.postLoginDecorator(this._getTerms, { params, options })
  }

  async _changeTerms({ params, options }) {
    const body = {
      AgreementCode: params.agreementCode,
      AccountNumber: params.accountNumber,
      SortCode: params.sortCode,
      PackageEffectiveDate: params.packageEffectiveDate
    }

    return this.post('/account/ChangeTerms', {
      body,
      ...options
    })
  }

  async changeTerms(params, options) {
    return this.postLoginDecorator(this._changeTerms, { params, options })
  }
}

module.exports = ContisClient
