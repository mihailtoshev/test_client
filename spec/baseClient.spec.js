const nock = require('nock')

const BaseClient = require('../src/common/baseClient')

describe('base client', () => {
  const baseUrl = 'http://base.client.test.com'

  afterAll(() => nock.cleanAll())

  it('should retry requests on network error', async () => {
    const baseClient = new BaseClient({
      baseUrl,
      remoteServiceName: 'service',
      delayStrategy: () => 100,
      zipkin: false
    })

    const tryUntilFailSpy = jest.spyOn(baseClient, 'retryStrategy')

    const nockRes = nock(baseUrl)
      .get('/retry-test')
      .replyWithError({ code: 'ECONNRESET' })
      .persist()

    try {
      await baseClient.get('/retry-test')
    } catch (err) {
      expect(err.attempts).toBe(4)
      expect(tryUntilFailSpy).toHaveBeenCalledTimes(4)
      nockRes.isDone()
    }
  })

  it('should retry request on http error', async () => {
    const baseClient = new BaseClient({
      baseUrl,
      remoteServiceName: 'service',
      delayStrategy: () => 100,
      zipkin: false
    })

    const tryUntilFailSpy = jest.spyOn(baseClient, 'retryStrategy')

    const nockRes = nock(baseUrl)
      .get('/http-error')
      .reply(429, {
        result: 'to many requests'
      })
      .persist()

    const response = await baseClient.get('/http-error')

    expect(tryUntilFailSpy).toHaveBeenCalledTimes(4)
    expect(response.result).toBe('to many requests')
    nockRes.isDone()
  })

  it('should return response on successful request', async () => {
    const baseClient = new BaseClient({
      baseUrl,
      remoteServiceName: 'service',
      delayStrategy: () => 100,
      maxRetries: 100,
      zipkin: false
    })

    const tryUntilFailSpy = jest.spyOn(baseClient, 'retryStrategy')

    const nockRes = nock(baseUrl)
      .get('/success')
      .reply(200, {
        result: 'success'
      })
      .persist()

    const response = await baseClient.get('/success')
    expect(tryUntilFailSpy).toHaveBeenCalledTimes(1)
    expect(response.result).toBe('success')
    nockRes.isDone()
  })
})
