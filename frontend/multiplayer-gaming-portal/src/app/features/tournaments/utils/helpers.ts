export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
};

// Helper to simulate a conceptual wallet check/debit
export const simulateWalletDebit = async (userId: string, amount: number, currency: string): Promise<boolean> => {
  console.log(`[SimulatedWallet] Attempting to debit ${amount} ${currency} from user ${userId}.`);
  if (amount === 0) {
    console.log(`[SimulatedWallet] No fee to debit for user ${userId}.`);
    return true; // No fee
  }
  // In a real scenario, this would be an API call to WalletService.
  // For simulation, assume user has enough balance if amount > 0.
  if (amount > 0) {
     console.log(`[SimulatedWallet] Successfully debited ${amount} ${currency} from user ${userId} (simulated).`);
     return true;
  }
  console.log(`[SimulatedWallet] Debit failed for user ${userId} (simulated - e.g. insufficient funds).`);
  return false;
};

// Helper to simulate a conceptual wallet credit for payouts
export const simulateWalletCredit = async (userId: string, amount: number, currency: string, reason: string): Promise<boolean> => {
    console.log(`[SimulatedWallet] Attempting to credit ${amount} ${currency} to user ${userId} for ${reason}.`);
    if (amount > 0) {
        console.log(`[SimulatedWallet] Successfully credited ${amount} ${currency} to user ${userId} for ${reason} (simulated).`);
        return true;
    }
    console.log(`[SimulatedWallet] Credit not processed for user ${userId} (amount was 0 or less).`);
    return false;
};
