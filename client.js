// client.js - GenLayer Client Implementation for EcoGuardian
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = "0x24438946A2874987eBec87D9F45CC43c447b54DF";

export async function getGrantsCount() {
  const client = createClient({ chain: studionet });
  const count = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_grants_count',
    args: [],
  });
  return Number(count);
}

export async function getGrant(grantId) {
  const client = createClient({ chain: studionet });
  const rawGrant = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_grant',
    args: [Number(grantId)],
  });
  return JSON.parse(rawGrant);
}
