import { NextRequest, NextResponse } from 'next/server';
import { EligibilityChecker, checkDeBank, checkAirdropContracts } from '@/lib/providers/eligibility';
import { MOCK_ELIGIBILITY_DB } from '@/lib/db/airdrops';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address')?.toLowerCase();
  
  if (!address || !address.match(/^0x[a-f0-9]{40}$/)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  const checker = new EligibilityChecker();
  
  // Parallel check semua source
  const [protocolAirdrops, existingTokens, oldContracts] = await Promise.all([
    checker.checkAll(address),
    checkDeBank(address),
    checkAirdropContracts(address)
  ]);
  
  // Cek mock database untuk demo (hapus ini di production)
  const mockData = MOCK_ELIGIBILITY_DB[address] || [];
  
  // Merge semua results
  const allAirdrops = [
    ...protocolAirdrops,
    ...oldContracts,
    ...mockData.map((m: any) => ({
      name: m.protocol,
      amount: m.amount,
      status: m.status,
      eligible: true,
      icon: '🎁',
      color: 'from-blue-400 to-purple-500'
    }))
  ];
  
  // Calculate on-chain metrics untuk "Potential Airdrops"
  const metrics = await getOnChainMetrics(address);
  
  // Prediksi airdrop berbasis metrics (heuristic)
  const predictions = predictAirdrops(metrics);
  
  return NextResponse.json({
    success: true,
    address,
    timestamp: new Date().toISOString(),
    summary: {
      totalClaimable: allAirdrops.filter((a: any) => a.status === 'claimable').length,
      totalPending: allAirdrops.filter((a: any) => a.status === 'pending').length,
      totalValue: allAirdrops.reduce((sum: number, a: any) => sum + (parseFloat(a.amount) || 0), 0)
    },
    airdrops: allAirdrops,
    predictions, // Airdrop yang diprediksi bakal datang
    metrics
  });
}

async function getOnChainMetrics(address: string) {
  // Fetch basic metrics dari ETH mainnet
  try {
    const res = await fetch('https://eth.llamarpc.com', {
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
    return {
      nonce: parseInt(data.result, 16),
      activity: parseInt(data.result, 16) > 10 ? 'high' : 'low'
    };
  } catch (e) {
    return { nonce: 0, activity: 'unknown' };
  }
}

function predictAirdrops(metrics: any) {
  const predictions = [];
  
  // Heuristic sederhana
  if (metrics.nonce > 50) {
    predictions.push({
      name: 'LayerZero (Speculated)',
      confidence: 75,
      estAmount: '$1,000 - $3,000',
      reason: 'High transaction count detected'
    });
  }
  if (metrics.nonce > 100) {
    predictions.push({
      name: 'zkSync (Rumored)',
      confidence: 60,
      estAmount: '$500 - $2,000',
      reason: 'Active DeFi user profile'
    });
  }
  
  return predictions;
}
