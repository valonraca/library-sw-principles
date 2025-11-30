// Simple MailerService to encapsulate email sending
(function(){
  class MailerService {
    send(to, subject, body) {
      console.log(`[MailerService] to=${to} subject=${subject} body=${body}`);
      return true;
    }
  }

  window.MailerService = MailerService;
})();
