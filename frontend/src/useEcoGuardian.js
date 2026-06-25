import { useState, useCallback, useEffect } from 'react';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

let _readClient = null;

function getReadClient() {
  if (!_readClient) {
    _readClient = createClient({ chain: studionet });
  }
  return _readClient;
}

function getWriteClient(account) {
  return createClient({ chain: studionet, account });
}

// Convert Wei (u256) to human readable GEN string
export function formatGen(weiVal) {
  if (!weiVal) return '0';
  try {
    const big = BigInt(weiVal);
    const integerPart = big / 10n**18n;
    const fractionalPart = big % 10n**18n;
    let fractionStr = fractionalPart.toString().padStart(18, '0');
    fractionStr = fractionStr.replace(/0+$/, ''); // Trim trailing zeros
    if (fractionStr === '') {
      return integerPart.toString();
    }
    return `${integerPart}.${fractionStr.slice(0, 4)}`;
  } catch (e) {
    return '0';
  }
}

// Convert human readable GEN input to Wei (u256 BigInt)
export function parseGen(genVal) {
  if (!genVal || genVal.toString().trim() === '') return 0n;
  try {
    const parts = genVal.toString().split('.');
    let integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '';
    fractionalPart = fractionalPart.slice(0, 18).padEnd(18, '0');
    return BigInt(integerPart) * 10n**18n + BigInt(fractionalPart);
  } catch (e) {
    return 0n;
  }
}

export function useEcoGuardian() {
  const [address, setAddress] = useState('');
  const [glAccount, setGlAccount] = useState(null);
  const [grants, setGrants] = useState([]);
  const [contractBalance, setContractBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [txStatus, setTxStatus] = useState('');

  // Connect Wallet (MetaMask/ethereum provider or fallback ephemeral account)
  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const addr = accounts[0].toLowerCase();
        setAddress(addr);
        setGlAccount(addr);
      } else {
        // Ephemeral account fallback
        let savedKey = localStorage.getItem('__ecoguardian_sk');
        let acct;
        if (savedKey) {
          acct = createAccount(savedKey);
        } else {
          acct = createAccount();
          localStorage.setItem('__ecoguardian_sk', acct.privateKey);
        }
        const addr = acct.address.toLowerCase();
        setAddress(addr);
        setGlAccount(acct);
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setError('Wallet connection failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all grants and contract balance
  const fetchGrantsState = useCallback(async () => {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return;
    setLoading(true);
    try {
      const client = getReadClient();
      
      // Get the number of grants
      const rawCount = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_grants_count',
        args: [],
      });
      const count = Number(rawCount);
      
      const fetchedGrants = [];
      for (let i = 0; i < count; i++) {
        const rawGrant = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_grant',
          args: [i],
        });
        if (rawGrant && rawGrant !== '{}') {
          const grantObj = JSON.parse(rawGrant);
          fetchedGrants.push(grantObj);
        }
      }
      
      // Get balance of contract (pool balance)
      const rawBalance = await client.getBalance({ address: CONTRACT_ADDRESS });
      setContractBalance(rawBalance.toString());
      
      setGrants(fetchedGrants.reverse()); // Show newest first
      setError('');
    } catch (err) {
      console.error('Error fetching grants:', err);
      setError('Failed to fetch grants: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create Grant (Lock GEN, set NGO and milestones)
  const createGrant = async (ngoAddress, conservationGoal, stakeAmt) => {
    if (!glAccount || !CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }
    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Funding Grant: locking ${stakeAmt} GEN for NGO ${ngoAddress}...`);

    try {
      const client = getWriteClient(glAccount);
      const valueWei = parseGen(stakeAmt);
      
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'create_grant',
        args: [ngoAddress.trim(), conservationGoal.trim()],
        value: valueWei,
      });
      
      setTxHash(hash);
      setTxStatus('Submitting grant creation transaction. Locking funds in escrow...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Contract execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Success! Conservation grant established.');
      await fetchGrantsState();
      return receipt;
    } catch (err) {
      console.error('Grant creation failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Audit Milestone (NGO submits field report URL to trigger payout check)
  const auditMilestone = async (grantId, fieldReportUrl) => {
    if (!glAccount || !CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }
    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Requesting payout: initiating AI consensus milestone audit for grant #${grantId}...`);

    try {
      const client = getWriteClient(glAccount);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'audit_milestone',
        args: [Number(grantId), fieldReportUrl.trim()],
      });
      
      setTxHash(hash);
      setTxStatus('AI Ecological Scientists are rendering the field report and auditing population metrics. Please wait 15-30s...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Audit execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Consensus complete! Ecological milestone evaluation finalized.');
      await fetchGrantsState();
      return receipt;
    } catch (err) {
      console.error('Milestone audit failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      fetchGrantsState();
    }
  }, [CONTRACT_ADDRESS, address, fetchGrantsState]);

  return {
    address,
    grants,
    contractBalance,
    loading,
    error,
    txHash,
    txStatus,
    connectWallet,
    fetchGrantsState,
    createGrant,
    auditMilestone,
    contractAddress: CONTRACT_ADDRESS,
  };
}
