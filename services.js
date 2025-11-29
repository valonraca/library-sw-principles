export class ConsoleNotifier {
    send(to, subject, body) {
        console.log(`[Email] to=${to} | subject="${subject}" | body="${body}"`);
        return true;
    }
}

export class MockPaymentProvider {
    charge(amount, card) {
        console.log(`[Payment] Charging $${amount} to card ${card}`);
        return { ok: true, id: Math.random().toString(36).slice(2) };
    }
}
