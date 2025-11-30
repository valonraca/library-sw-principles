export class LibraryService {
  constructor(bookRepo, memberRepo, payment, notifier) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.payment = payment;
    this.notifier = notifier;
  }

  addBook(id, title, author) {
    if (!id || !title) throw new Error("Missing fields");
    const book = { id, title, author, available: true };
    this.bookRepo.push(book);
    return book;
  }

  registerMember(id, name, email) {
    if (!email || !email.includes("@")) throw new Error("Invalid email");
    const member = { id, name, email, fees: 0 };
    this.memberRepo.push(member);
    this.notifier.send(email, "Welcome", `Hi ${name}`);
    return member;
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111-1111") {
    const book = this.bookRepo.find(b => b.id === bookId);
    const member = this.memberRepo.find(m => m.id === memberId);
    if (!book) throw new Error("Book not found");
    if (!member) throw new Error("Member not found");
    if (!book.available) throw new Error("Unavailable");

    let fee = 0;
    if (days > 14) fee = (days - 14) * 0.5;
    if (fee > 0) {
      const ok = this.payment.charge(fee, card);
      if (!ok) throw new Error("Payment failed");
      member.fees += fee;
    }

    book.available = false;
    this.notifier.send(member.email, "Checkout", `You borrowed ${book.title}`);
    return { book, member, fee };
  }
}
