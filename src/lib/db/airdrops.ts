// List airdrop REAL yang sedang bisa di-check (update manual/test有的放矢)
export const ACTIVE_AIRDROP_PROTOCOLS = [
  {
    id: 'linea-voyage',
    name: 'Linea Voyage',
    ticker: 'LINEA',
    status: 'active',
    claimUrl: 'https://linea.build/claim',
    // API Check
    checker: 'api',
    endpoint: 'https://linea-xp-poh-api.linea.build/api/poh/{address}',
    responsePath: 'pohStatus', // 1 = eligible
    estimateField: 'xpAmount'
  },
  {
    id: 'starknet-provisions',
    name: 'Starknet Provisions',
    ticker: 'STRK',
    status: 'claimable',
    claimUrl: 'https://provisions.starknet.io',
    checker: 'contract', // Check via smart contract
    contract: '0x...', // Provision contract
    merkleRoot: 'https://...' // IPFS/json merkle tree
  },
  {
    id: 'eigenlayer',
    name: 'EigenLayer Season 2',
    ticker: 'EIGEN',
    status: 'active',
    checker: 'rpc',
    contract: '0x858646372CCbE1c2aFA3E5cf16b13dbB12D6EB34', // Reward coordinator
    method: 'getClaimableRewards'
  }
];

// Mock database untuk simulasi (kalo belum ada API real)
export const MOCK_ELIGIBILITY_DB: Record<string, any[]> = {
  // Address -> Array of eligible airdrops
  '0x1691565c9E5846b348Bf21707521e492614df376': [
    { protocol: 'Linea', amount: 2500, status: 'claimable' },
    { protocol: 'EigenLayer', amount: 1200, status: 'pending' }
  ]
};
