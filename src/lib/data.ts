export const CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', icon: '🔷', color: '#627EEA', rpc: 'https://eth.llamarpc.com' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', icon: '🟣', color: '#8247E5', rpc: 'https://polygon.llamarpc.com' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', icon: '🔵', color: '#28A0F0', rpc: 'https://arbitrum.llamarpc.com' },
  { id: 10, name: 'Optimism', symbol: 'ETH', icon: '🔴', color: '#FF0420', rpc: 'https://optimism.llamarpc.com' },
  { id: 8453, name: 'Base', symbol: 'ETH', icon: '🔵', color: '#0052FF', rpc: 'https://base.llamarpc.com' },
  { id: 56, name: 'BSC', symbol: 'BNB', icon: '🟡', color: '#F3BA2F', rpc: 'https://bsc-dataseed.binance.org' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', icon: '🔺', color: '#E84142', rpc: 'https://api.avax.network/ext/bc/C/rpc' },
  { id: 59144, name: 'Linea', symbol: 'ETH', icon: '🌐', color: '#61DFFF', rpc: 'https://rpc.linea.build' },
  { id: 534352, name: 'Scroll', symbol: 'ETH', icon: '📜', color: '#FFEEDA', rpc: 'https://rpc.scroll.io' },
  { id: 1088, name: 'Metis', symbol: 'METIS', icon: '🌿', color: '#00CFFF', rpc: 'https://andromeda.metis.io/?owner=1088' }
];

// Mock airdrop database (simulasi drops.bot yang lengkap)
export const AIRDROP_DATABASE = [
  {
    id: 'pengu',
    name: 'Pengu',
    description: 'Cold-proof community',
    icon: '🐧',
    color: 'from-blue-400 to-cyan-300',
    minTx: 5,
    minValue: 0.1,
    maxReward: 2098,
    deadline: '2026-02-15',
    status: 'claimable'
  },
  {
    id: 'venice',
    name: 'Venice AI',
    description: 'AI-powered DeFi',
    icon: '🎭',
    color: 'from-purple-500 to-pink-500',
    minTx: 10,
    minValue: 0.5,
    maxReward: 755,
    deadline: '2026-02-20',
    status: 'claimable'
  },
  {
    id: 'morse',
    name: 'Morse',
    description: 'Privacy protocol',
    icon: '🔒',
    color: 'from-gray-600 to-gray-800',
    minTx: 3,
    minValue: 0.05,
    maxReward: 449,
    deadline: '2026-01-30',
    status: 'expiring'
  },
  {
    id: 'looped',
    name: 'loopedHYPE',
    description: 'Liquid staking',
    icon: '♾️',
    color: 'from-indigo-500 to-purple-600',
    minTx: 8,
    minValue: 0.2,
    maxReward: 324,
    deadline: '2026-03-01',
    status: 'claimable'
  },
  {
    id: 'monad',
    name: 'Monad',
    description: 'High-performance L1',
    icon: '🔷',
    color: 'from-teal-400 to-emerald-400',
    minTx: 20,
    minValue: 1.0,
    maxReward: 3000,
    deadline: '2026-04-01',
    status: 'pending'
  },
  {
    id: 'eclipse',
    name: 'Eclipse',
    description: 'Solana on Ethereum',
    icon: '🌑',
    color: 'from-orange-500 to-red-500',
    minTx: 15,
    minValue: 0.5,
    maxReward: 1500,
    deadline: '2026-02-28',
    status: 'claimable'
  }
];

export async function checkOnChainData(address: string, chainId: number) {
  const chain = CHAINS.find(c => c.id === chainId);
  if (!chain) return null;

  try {
    const res = await fetch(chain.rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionCount',
        params: [address, 'latest'],
        id: 1
      })
    });
    const data = await res.json();
    const txCount = parseInt(data.result || '0', 16);
    
    // Simulasi balance berdasarkan tx count
    const balance = txCount > 0 ? (Math.random() * 2).toFixed(4) : '0';
    
    return { txCount, balance, chain: chain.name, icon: chain.icon };
  } catch (e) {
    return null;
  }
}

export function checkAirdropEligibility(txCount: number, balance: number) {
  return AIRDROP_DATABASE.map(drop => {
    let eligible = false;
    let amount = 0;
    let daysLeft = Math.ceil((new Date(drop.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (txCount >= drop.minTx && parseFloat(String(balance)) >= drop.minValue) {
      eligible = true;
      // Calculate amount based on activity level
      const activityMultiplier = Math.min(txCount / 50, 1) + (parseFloat(String(balance)) / 10);
      amount = Math.floor(drop.maxReward * Math.min(activityMultiplier, 1) * (0.5 + Math.random() * 0.5));
    }
    
    return { ...drop, eligible, amount, daysLeft };
  }).filter(d => d.eligible).sort((a, b) => b.amount - a.amount);
}
