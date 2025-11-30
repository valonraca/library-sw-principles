// LibraryService.js
export class LibraryService {
  constructor({ bookRepo, memberRepo, notifier, payment }) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.notifier = notifier;
    this.payment = payment;
  }

  addBook(id, title, author) {
    if (!id || !title) {
      return this.notifier.failure('Missing fields');
    }
    const book = { id, title, author, available: true };
    this.bookRepo.save(book);
    return this.notifier.success(`Book added: ${title}`);
  }

  registerMember(id, name, email) {
    if (!email || !email.includes('@')) {
      return this.notifier.failure('Invalid email');
    }
    const member = { id, name, email, fees: 0 };
    this.memberRepo.save(member);
    // notifier.send welcome
    return this.notifier.success(`Member registered: ${name}`);
  }

  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
    const b = this.bookRepo.findById(bookId);
    const m = this.memberRepo.findById(memberId);
    if (!b) return this.notifier.failure('Book not found');
    if (!m) return this.notifier.failure('Member not found');
    if (!b.available) return this.notifier.failure('Book already checked out');

    let fee = 0;
    if (days > 14) fee = (days - 14) * 0.5;

    if (fee > 0) {
      const res = this.payment.charge(fee, card);
      if (!res || !res.ok) return this.notifier.failure('Payment failed');
      m.fees = (m.fees || 0) + fee;
      this.memberRepo.save(m);
    }

    b.available = false;
    this.bookRepo.save(b);

    this.notifier.success(`Checked out ${b.title} to ${m.name} (fee=$${fee})`);
    return { book: b, member: m, fee };
  }

  search(term) {
    const t = (term || '').trim().toLowerCase();
    return this.bookRepo.getAll().filter(b =>
      (b.title || '').toLowerCase().includes(t) ||
      (b.author || '').toLowerCase().includes(t)
    );
  }
}
