export class FakePayment {
  charge(amount, card) {
    console.log(`[FakeStripe] charging $${amount} to ${card}`);
    return true;
  }
}
