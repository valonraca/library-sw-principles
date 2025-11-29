export default class ConsoleEmailNotifier {
  send(to, subject, body) {
    console.log(`[Email] to=${to} | ${subject} | ${body}`);
    return true;
  }
}
