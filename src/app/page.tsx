'use client';

import { useState } from 'react';
import { ethers } from 'ethers';

const chains = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', color: 'violet', alchemy: true },
  { id: 137, name: 'Polygon', symbol: 'MATIC', color: 'purple', alchemy: true },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', color: 'blue', alchemy: true },
  { id: 10, name: 'Optimism', symbol: 'ETH', color: 'red', alchemy: true },
  { id: 8453, name: 'Base', symbol: 'ETH', color: 'blue', alchemy: true },
  { id: 56, name: 'BSC', symbol: 'BNB', color: 'yellow', alchemy: false },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', color: 'red', alchemy: false },
  { id: 59144, name: 'Linea', symbol: 'ETH', color: 'green', alchemy: true },
  { id: 534352, name: 'Scroll', symbol: 'ETH', color: 'orange', alchemy: false },
  { id: 1088, name: 'Metis', symbol: 'METIS', color: 'teal', alchemy: false },
];

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [selectedChain, setSelectedChain] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAddress(accounts[0]);
        setError(null);
      } catch (error) {
        console.error(error);
      }
    } else {
      alert('Install MetaMask!');
    }
  };

  const analyzeChain = async (chainId: number) => {
    if (!address) return;
    setLoading(true);
    setSelectedChain(chainId);
    setError(null);

    try {
      const response = await fetch(`/api/analyze?address=${address}&chainId=${chainId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch');
      }
      
      setStats(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAllChains = async () => {
    if (!address) return;
    setLoading(true);
    
    const promises = chains.map(chain => 
      fetch(`/api/analyze?address=${address}&chainId=${chain.id}`)
        .then(res => res.ok ? res.json() : null)
        .catch(() => null)
    );
    
    const results = await Promise.all(promises);
    const validResults = results.filter(r => r !== null);
    
    const aggregated = {
      chainName: 'Multi-Chain Aggregate',
      txCount: validResults.reduce((sum, r) => sum + (r.txCount || 0), 0),
      balance: validResults.reduce((sum, r) => sum + parseFloat(r.balance || 0), 0).toFixed(4),
      gasSpent: validResults.reduce((sum, r) => sum + parseFloat(r.gasSpent || 0), 0).toFixed(4),
      contractInteractions: validResults.reduce((sum, r) => sum + (r.contractInteractions || 0), 0),
      chainsChecked: validResults.length,
      activeDaysEstimate: Math.max(...validResults.map(r => r.activeDaysEstimate || 0)),
    };
    
    setStats(aggregated);
    setLoading(false);
  };

  const getAirdropScore = (stats: any) => {
    if (!stats) return 0;
    let score = 0;
    if (stats.txCount > 10) score += 20;
    if (stats.txCount > 50) score += 30;
    if (stats.txCount > 100) score += 20;
    if (stats.activeDaysEstimate > 30) score += 30;
    return Math.min(score, 100);
  };

  const score = getAirdropScore(stats);

  return (
    <main className="min-h-screen bg-black text-gray-300 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              MultiChain Airdrop Checker
            </h1>
            <p className="text-gray-500 mt-2">Powered by Alchemy API</p>
          </div>
          
          <button
            onClick={connectWallet}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/25"
          >
            {address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Connect Wallet'}
          </button>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl">
            Error: {error}
          </div>
        )}

        {address && (
          <>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Select Chain</h3>
                <button 
                  onClick={checkAllChains}
                  className="text-sm px-4 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 rounded-lg hover:bg-cyan-600/30 transition-all"
                >
                  Check All Chains ⚡
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
                        ? 'border-violet-500 bg-violet-500/20 shadow-lg shadow-violet-500/20' 
                        : 'border-gray-800 hover:border-gray-700 bg-gray-900/50 hover:bg-gray-800/50'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {chain.alchemy && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" title="Alchemy RPC"></span>
                    )}
                    <div className="font-semibold text-white">{chain.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{chain.symbol}</div>
                  </button>
                ))}
              </div>
            </div>

            {loading && (
              <div className="text-center py-12 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500 mx-auto"></div>
                <p className="text-gray-400">Analyzing on-chain data via Alchemy...</p>
              </div>
            )}

            {stats && !loading && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-violet-500/30 transition-all">
                    <h3 className="text-gray-400 text-sm mb-2">Total Transactions</h3>
                    <p className="text-3xl font-bold text-white font-mono">{stats.txCount}</p>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-pink-500/30 transition-all">
                    <h3 className="text-gray-400 text-sm mb-2">Balance</h3>
                    <p className="text-3xl font-bold text-white font-mono">{parseFloat(stats.balance).toFixed(4)}</p>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-cyan-500/30 transition-all">
                    <h3 className="text-gray-400 text-sm mb-2">Gas Spent (Est.)</h3>
                    <p className="text-3xl font-bold text-white font-mono">{stats.gasSpent || '0.0000'}</p>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-emerald-500/30 transition-all">
                    <h3 className="text-gray-400 text-sm mb-2">Network</h3>
                    <p className="text-lg font-bold text-white">{stats.chainName}</p>
                    {stats.rpcType && (
                      <span className="text-xs text-green-400">via {stats.rpcType}</span>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Airdrop Eligibility Score</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">
                      {score}%
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-violet-500 to-pink-500 h-3 rounded-full transition-all duration-1000 shadow-lg shadow-violet-500/30" 
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        {score >= 80 ? '🚀 High potential for major airdrops!' : 
                         score >= 50 ? '⚡ Good activity, keep grinding!' : 
                         '💡 Need more on-chain interactions'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-cyan-400">{stats.activeDaysEstimate}+</p>
                      <p className="text-xs text-gray-500">Active Days</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-pink-400">{stats.contractInteractions}</p>
                      <p className="text-xs text-gray-500">Contract Interactions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-violet-400">{(stats.txCount / 30).toFixed(1)}</p>
                      <p className="text-xs text-gray-500">Tx/Month (Est.)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400">{stats.chainsChecked || 1}</p>
                      <p className="text-xs text-gray-500">Chains Active</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-300">
                  <p>🔐 Data fetched securely via Alchemy API. Last updated: {stats.timestamp ? new Date(stats.timestamp).toLocaleString() : '-'}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
