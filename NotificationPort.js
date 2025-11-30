// Notifier "port": any object with a send(to, subject, body) method.
const ConsoleNotifier = {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject} body=${body}`);
    return true;
  }
};
