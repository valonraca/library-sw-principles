// Notification abstraction + console implementation.

export class Notifier {
  send(to, subject, body) {
    throw new Error('Not implemented');
  }
}

export class ConsoleNotifier extends Notifier {
  send(to = '(no-email)', subject = '(no-subject)', body = '') {
    // Fire-and-forget simulation
    try {
      console.log(`[Notifier] to=${to} subject=${subject} body=${body}`);
      return true;
    } catch (e) {
      console.warn('Notifier failed', e);
      return false;
    }
  }
}
