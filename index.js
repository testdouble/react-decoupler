if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/react-decoupler.production.min.js');
} else {
  module.exports = require('./dist/react-decoupler.development.js');
}
