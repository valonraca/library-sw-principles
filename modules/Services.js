// Interface for Notification
export class ConsoleNotifier {
    send(to, subject, body) {
        console.log(`[Email Mock] To: ${to} | Subj: ${subject} | Body: ${body}`);
    }
}

// Interface for Payment
export class MockPaymentProvider {
    charge(amount, card) {
        console.log(`[Payment] Charging $${amount} to card ${card}`);
        // Simulate a successful transaction object
        return { ok: true, txn: "txn_" + Math.random().toString(36).substr(2, 9) };
    }
}