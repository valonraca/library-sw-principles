export class MemberService {
  constructor(memberRepo, notifier) {
    this.memberRepo = memberRepo;
    this.notifier = notifier;
  }

  register(id, name, email) {
    if (!email.includes('@')) throw new Error('Invalid email');

    const members = this.memberRepo.getAll();
    members.push({ id, name, email, fees: 0 });
    this.memberRepo.saveAll(members);

    this.notifier.send(email, 'Welcome', `Hi ${name}, your id is ${id}`);
  }

  findById(id) {
    return this.memberRepo.getAll().find(m => m.id === id);
  }

  addFee(member, fee) {
    member.fees += fee;
    this.memberRepo.saveAll(this.memberRepo.getAll());
  }
}
