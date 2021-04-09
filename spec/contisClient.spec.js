const nock = require('nock')

const ContisClients = require('../src/thirdparty/contisClient')

jest.setTimeout(100000)
describe('contis client spec', () => {
  const baseUrl = 'http://base.client.test.com'
  const NEW_TOKEN_VALUE = 'new-token'
  const OLD_TOKEN_VALUE = 'expired-token'
  let contisClient
  let retryStrategySpy
  let loginSpy
  let getHeadersSpy

  beforeAll(() => {
    contisClient = new ContisClients({
      baseUrl,
      delayStrategy: () => 400,
      zipkin: false
    })
    retryStrategySpy = jest.spyOn(contisClient, 'retryStrategy')
    loginSpy = jest.spyOn(contisClient, 'login')
    getHeadersSpy = jest.spyOn(contisClient, 'getHeaders')
  })

  afterEach(() => {
    retryStrategySpy.mockClear()
    loginSpy.mockClear()
    getHeadersSpy.mockClear()
  })

  it('should should retry with new token after unauthorized request', async () => {
    contisClient.token = OLD_TOKEN_VALUE

    const listCardsNock = nock(baseUrl)
      .post('/card/ListCards')
      .reply(401, {
        Errors: [{}]
      })
      .persist()

    const getTokenNock = nock(baseUrl)
      .post('/Security/login')
      .reply(201, {
        access_token: NEW_TOKEN_VALUE
      })
      .persist()

    try {
      await contisClient.listCards()
    } catch (err) {
      listCardsNock.isDone()
      getTokenNock.isDone()
      expect(getHeadersSpy).toHaveNthReturnedWith(1, { Authorization: `Bearer ${OLD_TOKEN_VALUE}` })
      expect(getHeadersSpy).toHaveNthReturnedWith(2, { Authorization: `Bearer ${NEW_TOKEN_VALUE}` })
      expect(getHeadersSpy).toHaveNthReturnedWith(3, { Authorization: `Bearer ${NEW_TOKEN_VALUE}` })
      expect(getHeadersSpy).toHaveNthReturnedWith(4, { Authorization: `Bearer ${NEW_TOKEN_VALUE}` })
      expect(getHeadersSpy).toHaveNthReturnedWith(5, { Authorization: `Bearer ${NEW_TOKEN_VALUE}` })
      expect(loginSpy).toHaveBeenCalledTimes(4)
      expect(contisClient.token).toBe(NEW_TOKEN_VALUE)
      expect(retryStrategySpy).toHaveBeenCalledTimes(8)
    }
  })

  it('should get a new token if token does`t exist', async () => {
    contisClient.token = ''

    const postExternalTransactiponNock = nock(baseUrl)
      .post('/card/SetCardAsBlock')
      .reply(201, {
        message: 'success'
      })
      .persist()

    const getTokenNock = nock(baseUrl)
      .post('/Security/login')
      .reply(201, {
        token: NEW_TOKEN_VALUE
      })
      .persist()

    await contisClient.setCardBlocked()
    postExternalTransactiponNock.isDone()
    getTokenNock.isDone()
    expect(loginSpy).toHaveBeenCalledTimes(1)
    expect(contisClient.token).toBe(NEW_TOKEN_VALUE)
    expect(retryStrategySpy).toHaveBeenCalledTimes(2)
    expect(getHeadersSpy).toHaveReturnedWith({ Authorization: `Bearer ${NEW_TOKEN_VALUE}` })
  })

  it('should not do additional requests on successful response', async () => {
    const addConsumerNock = nock(baseUrl)
      .post('/consumer/AddConsumers')
      .reply(201, {
        message: 'success'
      })

    await contisClient.addConsumer({})
    addConsumerNock.isDone()
    expect(loginSpy).toHaveBeenCalledTimes(0)
    expect(contisClient.token).toBe(NEW_TOKEN_VALUE)
    expect(retryStrategySpy).toHaveBeenCalledTimes(1)
    expect(getHeadersSpy).toHaveReturnedWith({ Authorization: `Bearer ${NEW_TOKEN_VALUE}` })
  })
})
