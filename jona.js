  // Hard-coded concrete services (tight coupling)
  paymentProvider: {
    charge(amount, card) {
      console.log(`[FakeStripe] Charging $${amount} to ${card}`);
      return { ok: true, txn: Math.random().toString(36).slice(2) };
    }
  },
  mailer: {
    send(to, subject, body) {
      console.log(`[Email] to=${to} subject=${subject} body=${body}`);
      return true;
    }
  },