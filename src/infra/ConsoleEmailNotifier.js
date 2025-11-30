export default class ConsoleEmailNotifier {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject} body=${body}`);
    return true;
  }
}
