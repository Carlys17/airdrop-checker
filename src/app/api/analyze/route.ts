import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const getAlchemyConfig = (chainId: number, apiKey: string) => {
  const configs: any = {
    1: { name: 'Ethereum', url: `https://eth-mainnet.g.alchemy.com/v2/${apiKey}` },
    137: { name: 'Polygon', url: `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}` },
    42161: { name: 'Arbitrum', url: `https://arb-mainnet.g.alchemy.com/v2/${apiKey}` },
    10: { name: 'Optimism', url: `https://opt-mainnet.g.alchemy.com/v2/${apiKey}` },
    8453: { name: 'Base', url: `https://base-mainnet.g.alchemy.com/v2/${apiKey}` },
    59144: { name: 'Linea', url: `https://linea-mainnet.g.alchemy.com/v2/${apiKey}` },
  };
  return configs[chainId];
};

const publicConfigs: any = {
  56: { name: 'BSC', url: process.env.BSC_RPC || 'https://binance.llamarpc.com' },
  43114: { name: 'Avalanche', url: process.env.AVAX_RPC || 'https://avalanche-c-chain-rpc.publicnode.com' },
  1088: { name: 'Metis', url: 'https://andromeda.metis.io/?owner=1088' },
  534352: { name: 'Scroll', url: 'https://scroll.drpc.org' },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');
  const chainId = parseInt(searchParams.get('chainId') || '1');
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!address || !ethers.utils.isAddress(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  let config = apiKey ? getAlchemyConfig(chainId, apiKey) : null;
  
  if (!config) {
    config = publicConfigs[chainId];
  }

  if (!config) {
    return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 });
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(config.url);
    
    const [balance, txCount, blockNumber] = await Promise.all([
      provider.getBalance(address),
      provider.getTransactionCount(address),
      provider.getBlockNumber()
    ]);

    const activeDaysEstimate = Math.min(txCount * 2, 365);
    const contractInteractions = Math.floor(txCount * 0.3);
    const avgGasCost = chainId === 1 ? 0.005 : 0.001;
    const gasSpent = txCount * avgGasCost;

    return NextResponse.json({
      success: true,
      address,
      chainId,
      chainName: config.name,
      rpcType: apiKey && getAlchemyConfig(chainId, apiKey) ? 'alchemy' : 'public',
      balance: ethers.utils.formatEther(balance),
      txCount,
      blockNumber,
      activeDaysEstimate,
      contractInteractions,
      gasSpent: gasSpent.toFixed(4),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('RPC Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blockchain data', message: error.message, chainId }, 
      { status: 500 }
    );
  }
}
