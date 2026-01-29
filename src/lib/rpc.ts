export const CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', logo: '🔷', color: '#627EEA' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', logo: '#8247E5', color: '#8247E5' },
  { id: 42161, name: 'Arbitrum', symbol: 'ARB', logo: '#28A0F0', color: '#28A0F0' },
  { id: 10, name: 'Optimism', symbol: 'OP', logo: '#FF0420', color: '#FF0420' },
  { id: 8453, name: 'Base', symbol: 'BASE', logo: '#0052FF', color: '#0052FF' },
  { id: 56, name: 'BSC', symbol: 'BNB', logo: '#F3BA2F', color: '#F3BA2F' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', logo: '#E84142', color: '#E84142' },
  { id: 59144, name: 'Linea', symbol: 'ETH', logo: '#61DFFF', color: '#61DFFF' },
  { id: 534352, name: 'Scroll', symbol: 'ETH', logo: '#FFEEDA', color: '#E5D4B0' },
  { id: 1088, name: 'Metis', symbol: 'METIS', logo: '#00CFFF', color: '#00CFFF' }
];

const RPCS: any = {
  1: ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'],
  137: ['https://polygon.llamarpc.com', 'https://polygon-rpc.com'],
  42161: ['https://arbitrum.llamarpc.com', 'https://arb1.arbitrum.io/rpc'],
  10: ['https://optimism.llamarpc.com', 'https://mainnet.optimism.io'],
  8453: ['https://base.llamarpc.com', 'https://mainnet.base.org'],
  56: ['https://bsc-dataseed.binance.org', 'https://bsc.publicnode.com'],
  43114: ['https://api.avax.network/ext/bc/C/rpc'],
  59144: ['https://rpc.linea.build'],
  534352: ['https://rpc.scroll.io'],
  1088: ['https://andromeda.metis.io/?owner=1088']
};

export async function fetchRPC(chainId: number, method: string, params: any[]) {
  const urls = RPCS[chainId] || [];
  
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
      });
      const data = await res.json();
      if (data.result) return data.result;
    } catch (e) {}
  }
  throw new Error('RPC failed');
}
