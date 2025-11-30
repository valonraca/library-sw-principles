// Payment "port": any object with charge(amount, card) → { ok: boolean }
const FakePaymentProvider = {
  charge(amount, card) {
    console.log(`[FakeStripe] Charging $${amount} to ${card}`);
    return { ok: true, txn: Math.random().toString(36).slice(2) };
  }
};
