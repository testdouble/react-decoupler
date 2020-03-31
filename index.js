if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/react-service-injector.production.min.js')
} else {
  module.exports = require('./dist/react-service-injector.development.js')
}
