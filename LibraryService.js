class LibraryService {
constructor({ bookRepo, memberRepo, notifier, payment, feePolicy }) {
  this.bookRepo = bookRepo;
  this.memberRepo = memberRepo;
  this.notifier = notifier;
  this.payment = payment;
  this.feePolicy = feePolicy; 
}


  addBook(id, title, author) {
    if (!id || !title) {
      throw new Error('Missing fields');
    }
    const book = { id, title, author, available: true };
    this.bookRepo.add(book);
    return book;
  }

  registerMember(id, name, email) {
    if (!email || email.indexOf('@') < 0) {
      throw new Error('Invalid email');
    }
    const member = { id, name, email, fees: 0 };
    this.memberRepo.add(member);
    this.notifier.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
    return member;
  }

  checkoutBook(bookId, memberId, days = 21, card = '4111-1111') {
  const book = this.bookRepo.getById(bookId);
  const member = this.memberRepo.getById(memberId);

  if (!book) throw new Error('Book not found');
  if (!member) throw new Error('Member not found');
  if (!book.available) throw new Error('Book already checked out');

  // Use injected policy instead of hard-coded logic
  const fee = this.feePolicy.calculate(days);

  if (fee > 0) {
    const result = this.payment.charge(fee, card);
    if (!result || !result.ok) throw new Error('Payment failed');
    member.fees += fee;
    this.memberRepo.update(member);
  }

  book.available = false;
  this.bookRepo.update(book);

  this.notifier.send(
    member.email,
    'Checkout',
    `You borrowed ${book.title}. Fee: $${fee}`
  );

  return { book, member, fee };
}


  searchBooks(term) {
    const t = term.trim().toLowerCase();
    if (!t) return this.bookRepo.getAll();
    return this.bookRepo.getAll().filter(
      b =>
        b.title.toLowerCase().includes(t) ||
        (b.author && b.author.toLowerCase().includes(t))
    );
  }

  _calculateFee(days) {
    if (days <= 14) return 0;
    return (days - 14) * 0.5;
  }
}
