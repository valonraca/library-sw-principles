export class ConsoleNotifier {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject} body=${body}`);
  }
}
