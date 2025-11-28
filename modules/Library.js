export class Library {
    constructor(bookRepo, memberRepo, paymentService, notifierService) {
        this.bookRepo = bookRepo;
        this.memberRepo = memberRepo;
        this.paymentService = paymentService;
        this.notifierService = notifierService;

        // Load initial state
        this.books = this.bookRepo.load();
        this.members = this.memberRepo.load();
    }

    addBook(id, title, author) {
        if (!id || !title) throw new Error("Missing book details");
        this.books.push({ id, title, author, available: true });
        this.bookRepo.save(this.books);
    }

    registerMember(id, name, email) {
        if (!email.includes('@')) throw new Error("Invalid email");
        this.members.push({ id, name, email, fees: 0 });
        this.notifierService.send(email, "Welcome", `Welcome ${name}!`);
        this.memberRepo.save(this.members);
    }

    checkoutBook(bookId, memberId) {
        const book = this.books.find(b => b.id === bookId);
        const member = this.members.find(m => m.id === memberId);

        if (!book) throw new Error("Book not found");
        if (!member) throw new Error("Member not found");
        if (!book.available) throw new Error("Book not available");

        // Calculate fees (Logic moved here)
        const fee = 2.50; // Flat fee for simplicity in refactor
        const payment = this.paymentService.charge(fee, "4242-4242");

        if (payment.ok) {
            member.fees += fee;
            book.available = false;
            
            this.notifierService.send(member.email, "Checkout", `You borrowed ${book.title}`);
            
            this.bookRepo.save(this.books);
            this.memberRepo.save(this.members);
        } else {
            throw new Error("Payment failed");
        }
    }

    searchBooks(term) {
        const lowerTerm = term.toLowerCase();
        return this.books.filter(b => 
            b.title.toLowerCase().includes(lowerTerm) || 
            b.author.toLowerCase().includes(lowerTerm)
        );
    }
    
    // Getters for UI to use
    getAllBooks() { return this.books; }
    getMember(id) { return this.members.find(m => m.id === id); }
}