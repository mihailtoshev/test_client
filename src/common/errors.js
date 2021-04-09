const _ = require('lodash')

module.exports = {
  prettyContisErrors(err) {
    const error = new Error()
    error.name = 'UnprocessableEntity'
    if (_.get(err, 'Errors')) {
      error.errors = err.Errors.map(e => ({
        status: e.Status,
        message: e.Detail
      }))
      // When it's login it just has error
    } else if (_.get(err, 'error')) {
      error.error = err.error
    }
    throw error
  }
}
