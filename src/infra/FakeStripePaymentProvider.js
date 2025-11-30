export default class FakeStripePaymentProvider {
  charge(amount, card) {
    console.log(`[FakeStripe] Charging $${amount} to ${card}`);
    return {
      ok: true,
      txn: Math.random().toString(36).slice(2)
    };
  }
}
