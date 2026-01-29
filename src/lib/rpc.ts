// Client-side RPC calls - bypass serverless functions
export const CHAINS: any = {
  1: { 
    name: 'Ethereum', 
    symbol: 'ETH',
    rpcs: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum.publicnode.com'
    ]
  },
  137: { 
    name: 'Polygon', 
    symbol: 'MATIC',
    rpcs: [
      'https://polygon.llamarpc.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon-rpc.com'
    ]
  },
  42161: { 
    name: 'Arbitrum', 
    symbol: 'ETH',
    rpcs: [
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum',
      'https://arb1.arbitrum.io/rpc'
    ]
  },
  10: { 
    name: 'Optimism', 
    symbol: 'ETH',
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://mainnet.optimism.io'
    ]
  },
  8453: { 
    name: 'Base', 
    symbol: 'ETH',
    rpcs: [
      'https://base.llamarpc.com',
      'https://mainnet.base.org',
      'https://base.publicnode.com'
    ]
  },
  56: { 
    name: 'BSC', 
    symbol: 'BNB',
    rpcs: [
      'https://bsc-dataseed.binance.org',
      'https://bsc.publicnode.com',
      'https://rpc.ankr.com/bsc'
    ]
  },
  43114: { 
    name: 'Avalanche', 
    symbol: 'AVAX',
    rpcs: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.publicnode.com',
      'https://rpc.ankr.com/avalanche'
    ]
  },
  59144: { 
    name: 'Linea', 
    symbol: 'ETH',
    rpcs: [
      'https://rpc.linea.build',
      'https://linea.drpc.org'
    ]
  },
  534352: { 
    name: 'Scroll', 
    symbol: 'ETH',
    rpcs: [
      'https://rpc.scroll.io',
      'https://scroll.drpc.org'
    ]
  },
  1088: { 
    name: 'Metis', 
    symbol: 'METIS',
    rpcs: [
      'https://andromeda.metis.io/?owner=1088'
    ]
  }
};

// Fungsi fetch dengan fallback RPC
export async function fetchWithFallback(chainId: number, method: string, params: any[]) {
  const chain = CHAINS[chainId];
  if (!chain) throw new Error('Chain not supported');

  const payload = {
    jsonrpc: '2.0',
    method: method,
    params: params,
    id: Date.now()
  };

  // Coba tiap RPC sampai berhasil
  for (const rpc of chain.rpcs) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5 detik timeout per RPC
      
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!res.ok) continue;
      
      const data = await res.json();
      if (data.error) continue;
      
      return data.result;
    } catch (e) {
      console.log(`RPC ${rpc} failed, trying next...`);
      continue;
    }
  }
  
  throw new Error('All RPCs failed for chain ' + chainId);
}

// Fungsi utama untuk analyze address
export async function analyzeAddress(address: string, chainId: number) {
  const [balance, txCount] = await Promise.all([
    fetchWithFallback(chainId, 'eth_getBalance', [address, 'latest']),
    fetchWithFallback(chainId, 'eth_getTransactionCount', [address, 'latest'])
  ]);

  // Convert hex ke decimal
  const balanceEth = parseInt(balance, 16) / 1e18;
  const txCountNum = parseInt(txCount, 16);
  
  const chain = CHAINS[chainId];
  const gasSpent = txCountNum * (chainId === 1 ? 0.005 : 0.001);
  const score = Math.min(Math.floor((txCountNum / 100) * 50) + Math.min(txCountNum * 0.5, 50), 100);

  return {
    success: true,
    address,
    chainId,
    chainName: chain.name,
    symbol: chain.symbol,
    balance: balanceEth.toFixed(4),
    txCount: txCountNum,
    gasSpent: gasSpent.toFixed(4),
    activeDaysEstimate: Math.min(txCountNum * 2, 365),
    contractInteractions: Math.floor(txCountNum * 0.3),
    airdropScore: score,
    timestamp: new Date().toISOString()
  };
}
