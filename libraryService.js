// libraryService.js
export class LibraryService {
  constructor(bookRepo, memberRepo, notifier, payment) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.notifier = notifier;
    this.payment = payment;
  }

  addBook(id, title, author) {
    if (!id || !title) throw new Error('Missing fields');
    const books = this.bookRepo.getAll();
    books.push({ id, title, author, available: true });
    this.bookRepo.saveAll(books);
    return `Book added: ${title}`;
  }

  registerMember(id, name, email) {
    if (!email.includes('@')) throw new Error('Invalid email');
    const members = this.memberRepo.getAll();
    members.push({ id, name, email, fees: 0 });
    this.memberRepo.saveAll(members);
    this.notifier.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
    return `Member registered: ${name}`;
  }

  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
    const books = this.bookRepo.getAll();
    const members = this.memberRepo.getAll();
    const b = books.find(x => x.id === bookId);
    const m = members.find(x => x.id === memberId);
    if (!b || !m) throw new Error('Book or member not found');
    if (!b.available) throw new Error('Book unavailable');

    let fee = days > 14 ? (days - 14) * 0.5 : 0;
    if (fee > 0) {
      const result = this.payment.charge(fee, card);
      if (!result.ok) throw new Error('Payment failed');
      m.fees += fee;
    }

    b.available = false;
    this.bookRepo.saveAll(books);
    this.memberRepo.saveAll(members);
    this.notifier.send(m.email, 'Checkout', `You borrowed ${b.title}. Fee: $${fee}`);
    return `Checked out ${b.title} to ${m.name} for ${days} days (fee=$${fee})`;
  }
}
