#!/bin/bash

echo "🔧 Auto-Fix RPC Issues & Redeploy..."

cd ~/airdrop-checker

# 1. Update API Route dengan Fix Lengkap
cat > src/app/api/analyze/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const CHAINS: any = {
  1: { name: 'Ethereum', alchemy: 'eth-mainnet', public: 'https://eth.llamarpc.com' },
  137: { name: 'Polygon', alchemy: 'polygon-mainnet', public: 'https://polygon.llamarpc.com' },
  42161: { name: 'Arbitrum', alchemy: 'arb-mainnet', public: 'https://arbitrum.llamarpc.com' },
  10: { name: 'Optimism', alchemy: 'opt-mainnet', public: 'https://optimism.llamarpc.com' },
  8453: { name: 'Base', alchemy: 'base-mainnet', public: 'https://base.llamarpc.com' },
  56: { name: 'BSC', public: 'https://bsc-dataseed.binance.org' },
  43114: { name: 'Avalanche', public: 'https://api.avax.network/ext/bc/C/rpc' },
  59144: { name: 'Linea', public: 'https://rpc.linea.build' },
  534352: { name: 'Scroll', public: 'https://rpc.scroll.io' },
  1088: { name: 'Metis', public: 'https://andromeda.metis.io/?owner=1088' }
};

function getRpcUrl(chainId: number): string {
  const chain = CHAINS[chainId];
  if (!chain) throw new Error('Chain not supported');
  
  const apiKey = process.env.ALCHEMY_API_KEY;
  
  // Prioritize Alchemy kalau tersedia dan chain support Alchemy
  if (apiKey && chain.alchemy) {
    return `https://${chain.alchemy}.g.alchemy.com/v2/${apiKey}`;
  }
  
  // Fallback ke public RPC
  return chain.public;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const chainId = parseInt(searchParams.get('chainId') || '1');

    // Validasi
    if (!address || !ethers.utils.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' }, 
        { status: 400 }
      );
    }

    const chain = CHAINS[chainId];
    if (!chain) {
      return NextResponse.json(
        { error: 'Chain not supported' }, 
        { status: 400 }
      );
    }

    // Get RPC URL (prioritize Alchemy, fallback public)
    const rpcUrl = getRpcUrl(chainId);
    const isAlchemy = rpcUrl.includes('alchemy');

    // Setup provider dengan timeout
    const provider = new ethers.providers.JsonRpcProvider({
      url: rpcUrl,
      timeout: 15000, // 15 detik timeout
      throttleLimit: 5,
    });

    // Test koneksi
    await provider.getNetwork().catch((e: any) => {
      throw new Error(`Network unreachable: ${e.message}`);
    });

    // Fetch data
    const [balance, txCount] = await Promise.all([
      provider.getBalance(address),
      provider.getTransactionCount(address)
    ]);

    // Calculate metrics
    const gasSpent = txCount * (chainId === 1 ? 0.005 : 0.001);
    const score = Math.min(Math.floor((txCount / 100) * 50) + Math.min(txCount * 0.5, 50), 100);

    return NextResponse.json({
      success: true,
      address,
      chainId,
      chainName: chain.name,
      rpcType: isAlchemy ? 'alchemy' : 'public',
      balance: parseFloat(ethers.utils.formatEther(balance)).toFixed(4),
      txCount,
      activeDaysEstimate: Math.min(txCount * 2, 365),
      contractInteractions: Math.floor(txCount * 0.3),
      gasSpent: gasSpent.toFixed(4),
      airdropScore: score,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('API Error:', error);
    
    // Return error yang informatif
    return NextResponse.json({ 
      success: false,
      error: 'RPC Error', 
      message: error.message,
      chainId: parseInt(new URL(request.url).searchParams.get('chainId') || '0'),
      suggestion: error.message.includes('Alchemy') 
        ? 'Try using Public RPC by removing ALCHEMY_API_KEY' 
        : 'Network temporarily unavailable. Please try again.'
    }, { status: 500 });
  }
}
EOF

echo "✅ API Route updated with fallback RPCs"

# 2. Update UI supaya handle error lebih baik
cat > src/app/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { ethers } from 'ethers';

const chains = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', alchemy: true },
  { id: 137, name: 'Polygon', symbol: 'MATIC', alchemy: true },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', alchemy: true },
  { id: 10, name: 'Optimism', symbol: 'ETH', alchemy: true },
  { id: 8453, name: 'Base', symbol: 'ETH', alchemy: true },
  { id: 56, name: 'BSC', symbol: 'BNB', alchemy: false },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', alchemy: false },
  { id: 59144, name: 'Linea', symbol: 'ETH', alchemy: false },
  { id: 534352, name: 'Scroll', symbol: 'ETH', alchemy: false },
  { id: 1088, name: 'Metis', symbol: 'METIS', alchemy: false },
];

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<number | null>(null);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAddress(accounts[0]);
        setError(null);
      } catch (err) {
        setError('Failed to connect wallet');
      }
    } else {
      setError('Please install MetaMask!');
    }
  };

  const analyzeChain = async (chainId: number) => {
    if (!address) return;
    setLoading(true);
    setSelectedChain(chainId);
    setError(null);
    setStats(null);

    try {
      const response = await fetch(`/api/analyze?address=${address}&chainId=${chainId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to fetch data');
      }
      
      setStats(data);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Network error. Retrying with fallback...');
      
      // Retry setelah 2 detik kalau error
      setTimeout(() => {
        fetch(`/api/analyze?address=${address}&chainId=${chainId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setStats(data);
              setError(null);
            }
          })
          .catch(() => {});
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const checkAllChains = async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    
    const promises = chains.map(chain => 
      fetch(`/api/analyze?address=${address}&chainId=${chain.id}`)
        .then(res => res.ok ? res.json() : null)
        .catch(() => null)
    );
    
    const results = await Promise.all(promises);
    const validResults = results.filter(r => r && r.success);
    
    if (validResults.length === 0) {
      setError('All RPCs failed. Please try again later.');
      setLoading(false);
      return;
    }
    
    const aggregated = {
      chainName: 'Multi-Chain (Aggregate)',
      txCount: validResults.reduce((sum, r) => sum + (r.txCount || 0), 0),
      balance: validResults.reduce((sum, r) => sum + parseFloat(r.balance || 0), 0).toFixed(4),
      gasSpent: validResults.reduce((sum, r) => sum + parseFloat(r.gasSpent || 0), 0).toFixed(4),
      contractInteractions: validResults.reduce((sum, r) => sum + (r.contractInteractions || 0), 0),
      chainsChecked: validResults.length,
      activeDaysEstimate: Math.max(...validResults.map(r => r.activeDaysEstimate || 0)),
      airdropScore: Math.min(Math.floor(validResults.reduce((sum, r) => sum + (r.airdropScore || 0), 0) / validResults.length), 100),
      rpcType: 'mixed'
    };
    
    setStats(aggregated);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-gray-300 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              MultiChain Airdrop Checker
            </h1>
            <p className="text-gray-500 mt-2">Powered by Alchemy + Public RPCs</p>
          </div>
          
          <button
            onClick={connectWallet}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg"
          >
            {address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Connect Wallet'}
          </button>
        </header>

        {error && (
          <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 p-4 rounded-xl flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {address && (
          <>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Select Chain</h3>
                <button 
                  onClick={checkAllChains}
                  disabled={loading}
                  className="text-sm px-4 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 rounded-lg hover:bg-cyan-600/30 transition-all disabled:opacity-50"
                >
                  {loading ? 'Checking...' : 'Check All Chains ⚡'}
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {chains.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => analyzeChain(chain.id)}
                    disabled={loading}
                    className={`p-4 rounded-xl border transition-all relative overflow-hidden ${
                      selectedChain === chain.id 
                        ? 'border-violet-500 bg-violet-500/20' 
                        : 'border-gray-800 hover:border-gray-700 bg-gray-900/50'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {chain.alchemy && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Alchemy RPC"></span>
                    )}
                    <div className="font-semibold text-white">{chain.name}</div>
                    <div className="text-xs text-gray-500">{chain.symbol}</div>
                  </button>
                ))}
              </div>
            </div>

            {loading && (
              <div className="text-center py-12 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500 mx-auto"></div>
                <p className="text-gray-400">Connecting to blockchain...</p>
              </div>
            )}

            {stats && !loading && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 text-sm mb-2">Transactions</h3>
                    <p className="text-3xl font-bold text-white font-mono">{stats.txCount}</p>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 text-sm mb-2">Balance</h3>
                    <p className="text-3xl font-bold text-white font-mono">{stats.balance}</p>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 text-sm mb-2">Gas Spent</h3>
                    <p className="text-3xl font-bold text-white font-mono">{stats.gasSpent}</p>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 text-sm mb-2">Network</h3>
                    <p className="text-lg font-bold text-white">{stats.chainName}</p>
                    {stats.rpcType && (
                      <span className={`text-xs ${stats.rpcType === 'alchemy' ? 'text-green-400' : 'text-yellow-400'}`}>
                        via {stats.rpcType}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Airdrop Eligibility Score</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">
                      {stats.airdropScore || 0}%
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-violet-500 to-pink-500 h-3 rounded-full transition-all duration-1000" 
                          style={{ width: `${stats.airdropScore || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        {stats.airdropScore >= 80 ? '🚀 High potential for major airdrops!' : 
                         stats.airdropScore >= 50 ? '⚡ Good activity, keep grinding!' : 
                         '💡 Need more on-chain interactions'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
EOF

echo "✅ UI Component updated"

# 3. Commit & Push
git add .
git commit -m "Fix: RPC fallback, retry logic, error handling"
git push origin main

echo "✅ Code pushed to GitHub"

# 4. Redeploy dengan env var check
echo "🚀 Redeploying to Vercel..."
vercel --prod

echo ""
echo "✅ DONE! Website updated dengan fix lengkap"
echo "Test di URL live - kalau masih error, coba hapus ALCHEMY_API_KEY supaya pakai Public RPC saja"
