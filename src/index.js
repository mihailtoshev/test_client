const BaseClient = require('./common/baseClient')
const ClearJunctionClient = require('./thirdparty/clearJunctionClient')
const ComplyAdvantageClient = require('./thirdparty/complyAdvantageClient')
const ContisClient = require('./thirdparty/contisClient')
const DexAdminClient = require('./plutus/dexAdminClient')
const CrystalClient = require('./thirdparty/crystalClient')
const SynapsClient = require('./thirdparty/synapsClient')
const SubscriptionClient = require('./plutus/subscriptionsServiceClient')
const AuthServiceClient = require('./plutus/authServiceClient')
const blockchainClients = require('./blockchain/index')
const VeriffClient = require('./thirdparty/veriffClient')

module.exports = {
  BaseClient,
  ClearJunctionClient,
  ComplyAdvantageClient,
  ContisClient,
  CrystalClient,
  SynapsClient,
  DexAdminClient,
  SubscriptionClient,
  AuthServiceClient,
  ...blockchainClients,
  VeriffClient
}
