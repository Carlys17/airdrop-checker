import { ACTIVE_AIRDROP_PROTOCOLS, AirdropProtocol } from '../db/airdrops';

export interface EligibilityResult {
  name: string;
  ticker?: string;
  icon?: string;
  eligible: boolean;
  amount?: number | string;
  claimUrl?: string;
  deadline?: string;
  color?: string;
  status?: 'claimable' | 'pending';
  type?: 'token_balance';
}

export class EligibilityChecker {
  async checkAll(address: string) {
    const results: EligibilityResult[] = [];
    
    for (const protocol of ACTIVE_AIRDROP_PROTOCOLS) {
      try {
        const result = await this.checkProtocol(address, protocol);
        if (result.eligible) results.push(result);
      } catch (e) {
        console.error(`Failed to check ${protocol.name}:`, e);
      }
    }
    
    return results;
  }
  
  async checkProtocol(address: string, protocol: AirdropProtocol): Promise<EligibilityResult> {
    switch (protocol.checker) {
      case 'api':
        return this.checkViaAPI(address, protocol);
      case 'contract':
        return this.checkViaContract(address, protocol);
      case 'rpc':
        return this.checkViaRPC(address, protocol);
      default:
        return { eligible: false };
    }
  }
  
  async checkViaAPI(address: string, protocol: AirdropProtocol): Promise<EligibilityResult> {
    if (!protocol.endpoint || !protocol.responsePath) {
      return { name: protocol.name, eligible: false };
    }

    const url = protocol.endpoint.replace('{address}', address);
    const res = await fetch(url);
    const data: unknown = await res.json();
    
    const isEligible = this.getValueByPath(data, protocol.responsePath) === 1 || 
                      this.getValueByPath(data, protocol.responsePath) === true;
    
    return {
      name: protocol.name,
      ticker: protocol.ticker,
      icon: protocol.icon || '🪂',
      eligible: isEligible,
      amount: (protocol.estimateField && this.getValueByPath(data, protocol.estimateField)) || 'TBA',
      claimUrl: protocol.claimUrl,
      deadline: protocol.deadline,
      color: protocol.color || 'from-purple-500 to-pink-500'
    };
  }
  
  async checkViaContract(_address: string, protocol: AirdropProtocol): Promise<EligibilityResult> {
    // Implementasi ethers.js read contract
    // Contoh: check merkle proof atau balance claimable
    
    // Simplified: return mock untuk contoh
    return {
      name: protocol.name,
      eligible: false, // Implement real contract call here
      amount: 0
    };
  }
  
  async checkViaRPC(_address: string, protocol: AirdropProtocol): Promise<EligibilityResult> {
    // Direct RPC call ke contract
    return {
      name: protocol.name,
      eligible: false
    };
  }
  
  getValueByPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (typeof current === 'object' && current !== null && key in current) {
        return (current as Record<string, unknown>)[key];
      }

      return undefined;
    }, obj);
  }
}

// Provider tambahan: DeBank (Portfolio API)
export async function checkDeBank(address: string) {
  try {
    // DeBank Open API (Rate limited, but free)
    const url = `https://api.debank.com/user/addr?addr=${address}`;
    const res = await fetch(url);
    const data = await res.json();
    
    // Extract token list untuk detect airdrop tokens
    return data.data?.tokens || [];
  } catch {
    return [];
  }
}

// Provider: Check specific airdrop contracts
export async function checkAirdropContracts(address: string) {
  // List kontrak airdrop yang known
  const contracts = [
    { name: 'UNI Airdrop', contract: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', method: 'balanceOf' },
    { name: '1INCH', contract: '0x111111111117dC0aa78b770fA6A738034120C302', method: 'balanceOf' }
    // Tambahkan kontrak airdrop lain yang known
  ];
  
  const results: EligibilityResult[] = [];
  
  for (const airdrop of contracts) {
    try {
      // RPC call untuk check balance
      const rpcUrl = 'https://eth.llamarpc.com';
      const data: { result?: string } = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: airdrop.contract,
            data: `0x70a08231000000000000000000000000${address.slice(2)}` // balanceOf selector + address
          }, 'latest'],
          id: 1
        })
      }).then(r => r.json());
      
      const balance = parseInt(data.result, 16);
      if (balance > 0) {
        results.push({
          name: airdrop.name,
          eligible: true,
          amount: balance / 1e18,
          type: 'token_balance'
        });
      }
    } catch {}
  }
  
  return results;
}
