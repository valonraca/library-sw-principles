/****************************************************
 * Linor-ports.js
 * Payment provider, notifier, and logger implementations
 ****************************************************/

// Payment port implementation
export class FakeStripePaymentProvider {
  charge(amount, card) {
    console.log(`(Linor Payment) Charging $${amount} to ${card}`);
    return { ok: true, tx: "LINOR-" + Math.random().toString(36).slice(2) };
  }
}

// Notifier port implementation
export class ConsoleEmailNotifier {
  send(to, subject, body) {
    console.log(`(Linor Email) To: ${to} | ${subject}\n${body}`);
  }
}

// Simple in-memory logger
export class InMemoryLogger {
  constructor() {
    this.logs = [];
  }

  log(msg) {
    const time = new Date().toLocaleTimeString();
    this.logs.push(`[${time}] ${msg}`);
    if (this.logs.length > 40) {
      this.logs.shift();
    }
    console.log("LOG:", msg);
  }

  recent(n = 3) {
    return this.logs.slice(-n);
  }
}
