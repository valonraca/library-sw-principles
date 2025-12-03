const payment = {
  charge: function (amount, card) {
    console.log("[Payment] Charging $" + amount + " to " + card);
    return { ok: true };
  }
};

const notifier = {
  send: function (to, subject, body) {
    console.log("[Notifier] to=" + to + " subject=" + subject + " body=" + body);
  }
};
