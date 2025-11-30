// Minimal PaymentService to follow SRP/OCP: encapsulates charging logic
(function(){
  class PaymentService {
    // charge should return an object like { ok: boolean, txn?: string }
    charge(amount, card) {
      console.log(`[PaymentService] Charging $${amount} to ${card}`);
      return { ok: true, txn: Math.random().toString(36).slice(2) };
    }
  }

  // expose globally for now (simple browser app)
  window.PaymentService = PaymentService;
})();
