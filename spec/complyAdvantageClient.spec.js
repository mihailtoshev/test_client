const nock = require('nock')

const ComplyAdvantageClient = require('../src/thirdparty/complyAdvantageClient')

describe('comply advantage client spec', () => {
  const baseUrl = 'http://base.client.test.com'
  const NEW_TOKEN_VALUE = 'new-token'
  const OLD_TOKEN_VALUE = 'expired-token'
  let caClient
  let retryStrategySpy
  let loginSpy
  let getHeadersSpy

  beforeAll(() => {
    caClient = new ComplyAdvantageClient({
      baseUrl,
      delayStrategy: () => 400,
      zipkin: false
    })
    retryStrategySpy = jest.spyOn(caClient, 'retryStrategy')
    loginSpy = jest.spyOn(caClient, 'login')
    getHeadersSpy = jest.spyOn(caClient, 'getHeaders')
  })

  afterEach(() => {
    retryStrategySpy.mockClear()
    loginSpy.mockClear()
    getHeadersSpy.mockClear()
  })

  it('should should retry with new token after unauthorized request', async () => {
    caClient.token = 'expired-token'

    const getDataSourceNock = nock(baseUrl)
      .get('/external/datasource-results')
      .reply(401, {
        message: 'unauthorized'
      })
      .persist()

    const getTokenNock = nock(baseUrl)
      .post('/external/token-auth')
      .reply(201, {
        token: NEW_TOKEN_VALUE
      })
      .persist()

    await caClient.getProcessedTransactions()
    getDataSourceNock.isDone()
    getTokenNock.isDone()
    expect(getHeadersSpy).toHaveNthReturnedWith(1, { Authorization: `Token ${OLD_TOKEN_VALUE}` })
    expect(getHeadersSpy).toHaveNthReturnedWith(2, { Authorization: `Token ${NEW_TOKEN_VALUE}` })
    expect(getHeadersSpy).toHaveNthReturnedWith(3, { Authorization: `Token ${NEW_TOKEN_VALUE}` })
    expect(getHeadersSpy).toHaveNthReturnedWith(4, { Authorization: `Token ${NEW_TOKEN_VALUE}` })
    expect(getHeadersSpy).toHaveNthReturnedWith(5, { Authorization: `Token ${NEW_TOKEN_VALUE}` })
    expect(loginSpy).toHaveBeenCalledTimes(4)
    expect(caClient.token).toBe(NEW_TOKEN_VALUE)
    expect(retryStrategySpy).toHaveBeenCalledTimes(8)
  })

  it('should get a new token if token does`t exist', async () => {
    caClient.token = ''

    const postExternalTransactiponNock = nock(baseUrl)
      .post('/external/transactions')
      .reply(201, {
        message: 'success'
      })
      .persist()

    const getTokenNock = nock(baseUrl)
      .post('/external/token-auth')
      .reply(201, {
        token: NEW_TOKEN_VALUE
      })
      .persist()

    await caClient.sendTransaction({})
    postExternalTransactiponNock.isDone()
    getTokenNock.isDone()
    expect(getHeadersSpy).toHaveReturnedWith({ Authorization: `Token ${NEW_TOKEN_VALUE}` })
    expect(loginSpy).toHaveBeenCalledTimes(1)
    expect(caClient.token).toBe(NEW_TOKEN_VALUE)
    expect(retryStrategySpy).toHaveBeenCalledTimes(2)
  })

  it('should not do additional requests on successful response', async () => {
    const getExportStatusNock = nock(baseUrl)
      .get('/external/datasource-results/id')
      .reply(201, {
        message: 'success'
      })

    await caClient.getExportStatus('id')
    getExportStatusNock.isDone()
    expect(loginSpy).toHaveBeenCalledTimes(0)
    expect(getHeadersSpy).toHaveReturnedWith({ Authorization: `Token ${NEW_TOKEN_VALUE}` })
    expect(caClient.token).toBe(NEW_TOKEN_VALUE)
    expect(retryStrategySpy).toHaveBeenCalledTimes(1)
  })
})
