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
