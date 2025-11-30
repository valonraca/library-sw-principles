// Payment abstraction + fake implementation.
// Exports FakeStripe which simulates async charges.

export class PaymentProvider {
  // charge(amount:number, card:string) -> Promise<{ok:boolean, txn?:string}>
  async charge(amount, card) {
    throw new Error('Not implemented');
  }
}

export class FakeStripe extends PaymentProvider {
  async charge(amount = 0, card = 'card-unknown') {
    // Simulate network latency
    await new Promise(r => setTimeout(r, 120));
    const txn = 'txn_' + Math.random().toString(36).slice(2, 10);
    console.log(`[FakeStripe] charged $${Number(amount).toFixed(2)} on card=${card} txn=${txn}`);
    return { ok: true, txn };
  }
}
