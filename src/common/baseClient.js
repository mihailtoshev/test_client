/*  eslint-disable no-await-in-loop */
const _ = require('lodash')
const fetch = require('node-fetch')

const itemToBool = item => {
  if (typeof item !== 'object' || item === null) return item
  // eslint-disable-next-line no-use-before-define
  const cleanedItem = sanitize(item)
  return Object.keys(cleanedItem).length !== 0 && cleanedItem
}

const sanitize = obj => {
  if (Array.isArray(obj)) {
    const newArr = obj.map(itemToBool).filter(Boolean)
    return newArr.length && newArr
  }
  const newObj = Object.entries(obj).reduce((a, [key, val]) => {
    const newVal = itemToBool(val)
    // eslint-disable-next-line no-param-reassign
    if (newVal) a[key] = newVal
    return a
  }, {})
  return Object.keys(newObj).length > 0 && newObj
}

class BaseClient {
  constructor({
    baseUrl,
    withLogging = null,
    headers = {},
    maxRetries = 3,
    delayStrategy = this.getDelay,
    retryStrategy = this.isHTTPOrNetworkError
  }) {
    this.baseUrl = baseUrl
    this.headers = headers
    this.maxRetries = maxRetries
    this.attempts = 0
    this.delayStrategy = delayStrategy
    this.retryStrategy = retryStrategy
    this.RETRIABLE_ERRORS = [
      'ECONNRESET',
      'ENOTFOUND',
      'ESOCKETTIMEDOUT',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'EHOSTUNREACH',
      'EPIPE',
      'EAI_AGAIN',
      'ECONNABORTED'
    ]
    this.rxOne = /^[\],:{}\s]*$/
    // eslint-disable-next-line no-useless-escape
    this.rxTwo = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g
    // eslint-disable-next-line no-useless-escape
    this.rxThree = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g
    this.rxFour = /(?:^|:|,)(?:\s*\[)+/g
    if (withLogging && {}.toString.call(withLogging) !== '[object Function]') {
      throw new Error('withLogging must be a function')
    }
    this.withLogging = withLogging
  }

  async request(path, options) {
    const { maxRetries, delayStrategy, retryStrategy } = options
    this.delayStrategy = delayStrategy || this.delayStrategy
    this.retryStrategy = retryStrategy || this.retryStrategy
    const retryLimit = maxRetries || this.maxRetries

    return this.tryUntilFail({
      options: { ...options, url: this.baseUrl + path },
      retryLimit
    })
  }

  queryParams(params) {
    return Object.keys(params)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&')
  }

  async tryUntilFail({ options, retryLimit }) {
    let error
    let response
    let result
    let shouldRetry = false
    let attempts = 0
    // eslint-disable-next-line prefer-const
    let requestParams = await this.generateRequest(options)

    do {
      attempts += 1

      try {
        const { url, ...params } = requestParams
        response = await fetch(url, params)
        result = await this.parseResponse(response)
        response.attempts = attempts
      } catch (err) {
        err.attempts = attempts
        error = err
      }

      const retryOptions = await this.retryStrategy({ err: error, response, options })
      requestParams = _.isObject(retryOptions)
        ? await this.generateRequest({ url: options.url, ...retryOptions })
        : requestParams
      shouldRetry = Boolean(retryOptions) && retryLimit >= attempts

      if (!shouldRetry && !error) {
        return result
      }

      // You don't want to wait on last call when an error is returned
      // eslint-disable-next-line no-unused-expressions
      shouldRetry && (await this.wait(this.delayStrategy(attempts)))
    } while (shouldRetry)
    throw error
  }

  async getAuthorizationHeaders() {
    return {}
  }

  wait(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms)
    })
  }

  async generateRequest(options) {
    const { timeout = 10000, body = {}, headers = {}, method = 'GET', noAuthHeader = false } = options
    let { url } = options

    let requestBody = null

    if (['GET', 'HEAD'].indexOf(method) !== -1 && !_.isEmpty(body)) {
      const params = _.isString(body) ? JSON.parse(body) : body
      url += (url.indexOf('?') === -1 ? '?' : '&') + this.queryParams(params)
    } else {
      requestBody = _.isEmpty(body) ? null : _.isString(body) ? body : JSON.stringify(body)
    }

    // Skips empty params
    return sanitize({
      url,
      body: requestBody,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...headers,
        ...(noAuthHeader ? {} : await this.getAuthorizationHeaders(requestBody, options.signature || null))
      },
      method,
      timeout
    })
  }

  getDelay(attempt) {
    const delay = 2 ** attempt * 1000
    const random = delay * Math.random()
    return delay + random
  }

  isHTTPError({ response }) {
    const statusCode = response ? response.status : null
    return statusCode && (statusCode === 429 || (statusCode >= 500 && statusCode < 600) || statusCode === 401)
  }

  isNetworkError({ err }) {
    return err && this.RETRIABLE_ERRORS.includes(err.code)
  }

  isHTTPOrNetworkError({ err, response }) {
    return this.isHTTPError({ response }) || this.isNetworkError({ err })
  }

  // taken from https://github.com/douglascrockford/JSON-js/blob/master/json2.js
  isJSON(str) {
    return (
      str &&
      str.length &&
      this.rxOne.test(
        str
          .replace(this.rxTwo, '@')
          .replace(this.rxThree, ']')
          .replace(this.rxFour, '')
      )
    )
  }

  async parseResponse(response) {
    try {
      const responseBody = await response.text()
      if (this.withLogging) {
        this.withLogging(responseBody)
      }

      if (this.isJSON(responseBody)) return JSON.parse(responseBody)

      return responseBody
    } catch (err) {
      return {
        err,
        response
      }
    }
  }

  async get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' })
  }

  async post(path, options = {}) {
    return this.request(path, { ...options, method: 'POST' })
  }

  async put(path, options = {}) {
    return this.request(path, { ...options, method: 'PUT' })
  }

  async delete(path, options = {}) {
    return this.request(path, { ...options, method: 'DELETE' })
  }
}

module.exports = BaseClient
