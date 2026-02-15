'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AirdropItem {
  name: string;
  ticker?: string;
  icon?: string;
  amount?: number | string;
  status?: 'claimable' | 'pending';
  claimUrl?: string;
}

interface PredictionItem {
  name: string;
  confidence: number;
  estAmount: string;
  reason: string;
}

interface EligibilityResponse {
  address: string;
  summary: {
    totalValue: number;
  };
  airdrops: AirdropItem[];
  predictions: PredictionItem[];
  metrics: {
    nonce: number;
  };
}

export default function DropsClone() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EligibilityResponse | null>(null);
  const [error, setError] = useState('');

  const checkEligibility = async () => {
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Please enter a valid EVM address');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`/api/eligibility?address=${address}`);
      const data: EligibilityResponse | { error?: string } = await res.json();
      
      if (!res.ok) {
        throw new Error('error' in data ? data.error : 'Failed to check');
      }

      setResult(data as EligibilityResponse);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to check');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="border-b border-gray-200 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold">
              🪂
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              DropFinder
            </span>
          </div>
          <div className="flex gap-6 text-sm font-medium text-gray-600">
            <a href="#" className="hover:text-purple-600">Airdrops</a>
            <a href="#" className="hover:text-purple-600">API</a>
            <a href="#" className="hover:text-purple-600">Pricing</a>
          </div>
        </div>
      </nav>

      {!result ? (
        // LANDING PAGE (Persis drops.bot)
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Find unclaimed Airdrops
            </h1>
            <p className="text-xl text-gray-600">
              Check any wallet address for airdrop eligibility across multiple chains
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Paste wallet address (0x...)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && checkEligibility()}
                className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:outline-none transition-all shadow-lg"
              />
              <button
                onClick={checkEligibility}
                disabled={loading}
                className="absolute right-2 top-2 bottom-2 bg-purple-600 hover:bg-purple-700 text-white px-6 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                {loading ? 'Scanning...' : 'Check Address →'}
              </button>
            </div>
            {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
          </div>

          {/* Featured Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            {[
              { icon: '💰', title: '$2.5M+', desc: 'Total airdrops found' },
              { icon: '🔍', title: '50+', desc: 'Protocols tracked' },
              { icon: '⚡', title: 'Real-time', desc: 'Instant results' }
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100">
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="text-2xl font-bold text-gray-900">{item.title}</div>
                <div className="text-gray-600 text-sm">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // RESULTS PAGE
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Summary Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 text-white mb-8 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-purple-200 text-sm mb-1">Wallet</p>
                <h1 className="text-2xl font-mono font-bold">{result.address}</h1>
              </div>
              <div className="text-right">
                <p className="text-purple-200 text-sm">Total Value Found</p>
                <div className="text-5xl font-bold text-yellow-300">
                  ${result.summary.totalValue.toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-8 mt-8 pt-8 border-t border-white/20">
              <div>
                <div className="text-3xl font-bold">{result.airdrops.length}</div>
                <div className="text-purple-200 text-sm">Eligible Airdrops</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{result.predictions.length}</div>
                <div className="text-purple-200 text-sm">Predicted</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{result.metrics.nonce}</div>
                <div className="text-purple-200 text-sm">Transactions</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Airdrop Cards */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Claimable Airdrops</h2>
              
              <AnimatePresence>
                {result.airdrops.map((drop, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-4 hover:shadow-xl transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{drop.icon}</div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{drop.name}</h3>
                          <p className="text-gray-500 text-sm">{drop.ticker}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-purple-600">
                          {typeof drop.amount === 'number' ? `$${drop.amount.toLocaleString()}` : drop.amount}
                        </div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                          drop.status === 'claimable' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {drop.status}
                        </span>
                      </div>
                    </div>
                    
                    {drop.claimUrl && (
                      <a
                        href={drop.claimUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                      >
                        Claim Now →
                      </a>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {result.airdrops.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="text-6xl mb-4">😔</div>
                  <h3 className="text-xl font-semibold text-gray-900">No airdrops found yet</h3>
                  <p className="text-gray-600">Keep interacting with DeFi protocols!</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Potential</h2>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                {result.predictions.map((pred, idx: number) => (
                  <div key={idx} className="mb-4 pb-4 border-b border-gray-200 last:border-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-900">{pred.name}</span>
                      <span className="text-sm text-purple-600">{pred.confidence}%</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{pred.estAmount}</p>
                    <p className="text-xs text-gray-500">{pred.reason}</p>
                  </div>
                ))}
                
                {result.predictions.length === 0 && (
                  <p className="text-gray-500 text-sm">No predictions yet. Increase on-chain activity!</p>
                )}
              </div>

              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This checks known airdrop contracts. For comprehensive coverage like drops.bot, we would need to integrate 50+ private APIs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
