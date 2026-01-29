import { ACTIVE_AIRDROP_PROTOCOLS } from '../db/airdrops';

export class EligibilityChecker {
  async checkAll(address: string) {
    const results = [];
    
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
  
  async checkProtocol(address: string, protocol: any) {
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
  
  async checkViaAPI(address: string, protocol: any) {
    const url = protocol.endpoint.replace('{address}', address);
    const res = await fetch(url);
    const data = await res.json();
    
    const isEligible = this.getValueByPath(data, protocol.responsePath) === 1 || 
                      this.getValueByPath(data, protocol.responsePath) === true;
    
    return {
      name: protocol.name,
      ticker: protocol.ticker,
      icon: protocol.icon || '🪂',
      eligible: isEligible,
      amount: this.getValueByPath(data, protocol.estimateField) || 'TBA',
      claimUrl: protocol.claimUrl,
      deadline: protocol.deadline,
      color: protocol.color || 'from-purple-500 to-pink-500'
    };
  }
  
  async checkViaContract(address: string, protocol: any) {
    // Implementasi ethers.js read contract
    // Contoh: check merkle proof atau balance claimable
    
    // Simplified: return mock untuk contoh
    return {
      name: protocol.name,
      eligible: false, // Implement real contract call here
      amount: 0
    };
  }
  
  async checkViaRPC(address: string, protocol: any) {
    // Direct RPC call ke contract
    return {
      name: protocol.name,
      eligible: false
    };
  }
  
  getValueByPath(obj: any, path: string) {
    return path.split('.').reduce((o, p) => o?.[p], obj);
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
  } catch (e) {
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
  
  const results = [];
  
  for (constairdrop of contracts) {
    try {
      // RPC call untuk check balance
      const rpcUrl = 'https://eth.llamarpc.com';
      const data = await fetch(rpcUrl, {
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
    } catch (e) {}
  }
  
  return results;
}
