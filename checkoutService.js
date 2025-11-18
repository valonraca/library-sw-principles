export class CheckoutService {
  constructor(bookService, memberService, payment, notifier) {
    this.bookService = bookService;
    this.memberService = memberService;
    this.payment = payment;
    this.notifier = notifier;
  }

  checkout(bookId, memberId, days = 21, card = '4111-1111') {
    const book = this.bookService.findById(bookId);
    const member = this.memberService.findById(memberId);

    if (!book || !member) throw new Error('Book or member not found');
    if (!book.available) throw new Error('Book unavailable');

    const fee = days > 14 ? (days - 14) * 0.5 : 0;

    if (fee > 0) {
      const result = this.payment.charge(fee, card);
      if (!result.ok) throw new Error('Payment failed');
      this.memberService.addFee(member, fee);
    }

    this.bookService.setUnavailable(book);
    this.notifier.send(member.email, 'Checkout', `You borrowed ${book.title}. Fee: $${fee}`);

    return `Checked out ${book.title} to ${member.name} for ${days} days (fee=$${fee})`;
  }
}
