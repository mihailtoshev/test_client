const nock = require('nock')

const VeriffClient = require('../src/thirdparty/veriffClient')

describe('Veriff client spec', () => {
  const baseUrl = 'http://base.client.test.com'
  const apiKey = 'this is api key'
  const apiSecret = 'shh do not tell anyone, this is a secret'

  const mockPayload = {
    verification: {
      person: {
        firstName: 'John',
        lastName: 'Doe'
      },
      vendorData: 'jdoe@example.com',
      timestam: '2021-01-01T01:02:03.123Z'
    }
  }

  const expectedSignature = '2be4d3ee657ee78b03100d247efe31599be3d074ca5a38ccf711a6ff717b754c'

  const expectedAuthHeaders = {
    'x-auth-client': apiKey,
    'x-signature': expectedSignature
  }

  let veriffClient

  beforeAll(() => {
    veriffClient = new VeriffClient({
      baseUrl,
      apiKey,
      apiSecret
    })
  })

  describe('Generate signature', () => {
    it('should generate signature from object', async () => {
      const signature = await veriffClient.generateSignature(mockPayload)

      expect(signature).toEqual(expectedSignature)
    })

    it('should generate signature from string', async () => {
      const signature = await veriffClient.generateSignature(JSON.stringify(mockPayload))
      expect(signature).toEqual(expectedSignature)
    })

    it('should generate signature from buffer', async () => {
      const signature = await veriffClient.generateSignature(JSON.stringify(mockPayload))
      expect(signature).toEqual(expectedSignature)
    })
  })

  it('should generate authorization headers', async () => {
    const result = await veriffClient.getAuthorizationHeaders(Buffer.from(JSON.stringify(mockPayload), 'utf8'))
    expect(result).toEqual(expectedAuthHeaders)
  })

  it('should make a request for a session', async () => {
    const getSessionNock = new Promise(resolve => {
      nock(baseUrl)
        .post('/sessions')
        .reply(201, {
          status: 'success',
          verification: {}
        })
        .once('request', (request, interceptor, body) => {
          resolve({ request, body })
        })
    })

    await veriffClient.createSession(mockPayload)

    const { request, body } = await getSessionNock

    expect(body).toEqual(JSON.stringify(mockPayload))
    expect(request.headers['x-signature']).toContain(expectedSignature)
    expect(request.headers['x-auth-client']).toContain(apiKey)
  })
})
