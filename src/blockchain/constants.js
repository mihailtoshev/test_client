const CURRENCIES = {
  BTC: 'BTC',
  ETH: 'ETH',
  PLU: 'PLU'
}

module.exports = {
  CURRENCIES,
  UNITS: {
    [CURRENCIES.ETH]: {
      WEI: 'wei',
      GWEI: 'gwei'
    },
    [CURRENCIES.BTC]: {
      SATOSHI: 'satoshi'
    }
  },
  NETWORKS: {
    [CURRENCIES.ETH]: {
      MAINNET: 'mainnet',
      RINKEBY: 'rinkeby',
      ROPSTEN: 'ropsten',
      KOVAN: 'kovan',
      GOERLI: 'goerli'
    },
    [CURRENCIES.BTC]: {
      MAINNET: 'bitcoin',
      TESTNET: 'testnet'
    }
  },
  // M / purpose' / coin_type' / account' / change_address / address_index
  PATHS: {
    [CURRENCIES.ETH]: 'm/44\'/60\'/0\'/0/0',
    [CURRENCIES.BTC]: 'm/49\'/1\'/0\'/0/0'
  },
  // https://github.com/bitcoin/bips/blob/master/bip-0144.mediawiki#hashes
  SEGWIT: {
    marker: 0x00,
    flag: 0x01
  }
}
