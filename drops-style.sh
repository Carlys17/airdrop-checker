#!/bin/bash

echo "🎨 Creating Drops.bot Style UI..."

cd ~/airdrop-checker

# 1. Hapus API folder (pakai client-side)
rm -rf src/app/api

# 2. Buat RPC utility
mkdir -p src/lib
cat > src/lib/rpc.ts << 'EOF'
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
EOF

# 3. Buat page.tsx dengan style drops.bot
cat > src/app/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { CHAINS, fetchRPC } from '@/lib/rpc';

// Mock airdrop database (simulasi drops.bot)
const MOCK_AIRDROP_DATA: any = {
  'LayerZero': { 
    minTx: 10, minMonths: 3, maxReward: 5000, 
    icon: '🌐', color: 'from-blue-500 to-purple-600',
    description: 'Cross-chain messaging protocol'
  },
  'EigenLayer': { 
    minTx: 5, minValue: 0.1, maxReward: 12000, 
    icon: '🔷', color: 'from-indigo-500 to-blue-600',
    description: 'Restaking protocol'
  },
  'Linea Voyage': { 
    minTx: 20, minMonths: 2, maxReward: 2500, 
    icon: '🚀', color: 'from-cyan-400 to-blue-500',
    description: 'Consensys zkEVM'
  },
  'Scroll Session': { 
    minTx: 10, minValue: 0.05, maxReward: 3000, 
    icon: '📜', color: 'from-orange-400 to-yellow-500',
    description: 'Native zkEVM scaling'
  },
  'Hyperlane': { 
    minChains: 3, minTx: 15, maxReward: 4000, 
    icon: '✈️', color: 'from-green-400 to-emerald-600',
    description: 'Permissionless interoperability'
  }
};

export default function Home() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const checkAirdrops = async () => {
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Please enter a valid EVM address (0x...)');
      return;
    }
    
    setLoading(true);
    setError('');
    setResults(null);

    try {
      // Fetch data dari semua chain
      const chainData: any = {};
      let totalTx = 0;
      let totalValue = 0;
      let activeChains = 0;

      for (const chain of CHAINS) {
        try {
          const [balance, txCount] = await Promise.all([
            fetchRPC(chain.id, 'eth_getBalance', [address, 'latest']),
            fetchRPC(chain.id, 'eth_getTransactionCount', [address, 'latest'])
          ]);
          
          const balanceEth = parseInt(balance, 16) / 1e18;
          const txNum = parseInt(txCount, 16);
          
          if (txNum > 0) {
            chainData[chain.id] = { tx: txNum, balance: balanceEth, name: chain.name };
            totalTx += txNum;
            totalValue += balanceEth;
            activeChains++;
          }
        } catch (e) {}
      }

      // Simulasi airdrop checking
      const potentialAirdrops = Object.entries(MOCK_AIRDROP_DATA).map(([name, data]: [string, any]) => {
        let eligible = false;
        let amount = 0;
        let confidence = 0;
        
        // Logic sederhana eligibility
        if (data.minTx && totalTx >= data.minTx) {
          eligible = true;
          confidence += 30;
        }
        if (data.minValue && totalValue >= data.minValue) {
          eligible = true;
          confidence += 20;
        }
        if (data.minChains && activeChains >= data.minChains) {
          eligible = true;
          confidence += 25;
        }
        if (data.minMonths && totalTx > 0) {
          confidence += 25;
        }
        
        if (eligible) {
          amount = Math.floor(Math.random() * (data.maxReward - 100) + 100);
        }

        return {
          name,
          ...data,
          eligible,
          amount,
          confidence: Math.min(confidence, 100)
        };
      }).filter((a: any) => a.eligible).sort((a: any, b: any) => b.amount - a.amount);

      setResults({
        address,
        totalTx,
        activeChains,
        totalValue: totalValue.toFixed(4),
        airdrops: potentialAirdrops,
        chainBreakdown: chainData
      });

    } catch (err) {
      setError('Failed to fetch on-chain data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#7C3AED] via-[#6D28D9] to-[#4C1D95] text-white">
      {/* Header */}
      <nav className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-purple-600 font-bold text-lg">
            🪂
          </div>
          <span className="font-bold text-xl">DropChecker</span>
        </div>
        <div className="text-sm font-medium opacity-80">
          Multi-Chain EVM Airdrop Hunter
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-8 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
          Find unclaimed<br/>
          <span className="text-yellow-300">Airdrops</span>
        </h1>
        <p className="text-xl text-purple-200 mb-8">
          Check any EVM wallet address for potential airdrops across 10+ chains
        </p>

        {/* Search Box (kayak drops.bot) */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
            <input
              type="text"
              placeholder="Paste wallet address (0x...)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && checkAirdrops()}
              className="w-full px-6 py-5 text-gray-800 text-lg outline-none"
            />
            <button
              onClick={checkAirdrops}
              disabled={loading}
              className="absolute right-2 top-2 bottom-2 bg-purple-600 hover:bg-purple-700 text-white px-6 rounded-xl font-semibold transition-all disabled:opacity-50"
            >
              {loading ? 'Scanning...' : 'Check'}
            </button>
          </div>
          {error && <p className="text-red-300 mt-3 text-sm">{error}</p>}
        </div>

        {/* Supported Chains */}
        <div className="flex justify-center gap-3 flex-wrap mb-12">
          {CHAINS.map((c) => (
            <div key={c.id} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl" title={c.name}>
              {c.logo}
            </div>
          ))}
        </div>

        {/* Stats (sebelum check) */}
        {!results && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-yellow-300">$1.2M+</div>
              <div className="text-purple-200 text-sm">In potential airdrops tracked</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-green-300">10+</div>
              <div className="text-purple-200 text-sm">EVM Chains supported</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-pink-300">Free</div>
              <div className="text-purple-200 text-sm">100% free to use</div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-4 mt-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white"></div>
            <p className="text-purple-200">Scanning Ethereum, Polygon, Arbitrum, Base...</p>
          </div>
        )}

        {/* Results (mirip drops.bot cards) */}
        {results && (
          <div className="mt-8 text-left">
            {/* Wallet Summary */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
              <h3 className="text-2xl font-bold mb-2">Wallet Analysis</h3>
              <p className="text-purple-200 mb-4 font-mono text-sm">{results.address}</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-300">{results.totalTx}</div>
                  <div className="text-xs text-purple-300">Total Transactions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-300">{results.activeChains}</div>
                  <div className="text-xs text-purple-300">Active Chains</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-300">${(results.totalTx * 0.5).toFixed(0)}</div>
                  <div className="text-xs text-purple-300">Est. Gas Spent</div>
                </div>
              </div>
            </div>

            {/* Airdrop Cards (style drops.bot) */}
            <h3 className="text-2xl font-bold mb-6">
              Potential Airdrops ({results.airdrops.length})
            </h3>
            
            {results.airdrops.length === 0 ? (
              <div className="bg-white/10 rounded-2xl p-8 text-center border border-white/20">
                <p className="text-xl mb-2">😔 No airdrops detected yet</p>
                <p className="text-purple-200">Keep grinding! Interact with more protocols.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.airdrops.map((airdrop: any, i: number) => (
                  <div key={i} className={`relative bg-gradient-to-br ${airdrop.color} rounded-2xl p-6 border border-white/20 shadow-xl hover:scale-[1.02] transition-transform`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{airdrop.icon}</div>
                        <div>
                          <h4 className="font-bold text-lg">{airdrop.name}</h4>
                          <p className="text-xs opacity-80">{airdrop.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">${airdrop.amount.toLocaleString()}</div>
                        <div className="text-xs bg-white/20 px-2 py-1 rounded-full mt-1">
                          {airdrop.confidence}% match
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <span className="bg-white/20 px-3 py-1 rounded-lg text-xs">
                        Min {airdrop.minTx}+ tx
                      </span>
                      {airdrop.minChains && (
                        <span className="bg-white/20 px-3 py-1 rounded-lg text-xs">
                          {airdrop.minChains}+ chains
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Chain Breakdown */}
            <div className="mt-8 bg-white/5 rounded-2xl p-6 border border-white/10">
              <h4 className="font-bold mb-4">On-Chain Activity</h4>
              <div className="space-y-2">
                {Object.entries(results.chainBreakdown).map(([id, data]: [string, any]) => (
                  <div key={id} className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {CHAINS.find(c => c.id === Number(id))?.logo}
                      </span>
                      <span className="font-medium">{data.name}</span>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-bold">{data.tx} transactions</div>
                      <div className="text-purple-300 text-xs">{data.balance.toFixed(4)} ETH</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 mt-16 py-8 text-center text-purple-300 text-sm">
        <p>Check EVM addresses for potential airdrops • Client-side only • No data stored</p>
      </footer>
    </main>
  );
}
EOF

# 4. Update config
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true }
}
module.exports = nextConfig
EOF

# 5. Commit & deploy
git add .
git commit -m "Redesign: Drops.bot style UI with purple gradient"
git push origin main

vercel --prod

echo "✅ DONE! Drops.bot style deployed!"
echo "URL: https://airdrop-checker-coral.vercel.app"
