export class MemberRepo {
  constructor(storage) {
    this.storage = storage;
    this.key = "MEMBERS";
    this.members = storage.load(this.key) || [];
  }

  save() {
    this.storage.save(this.key, this.members);
  }

  add(m) {
    this.members.push(m);
    this.save();
  }

  get(id) {
    return this.members.find(b => b.id === id);
  }

  update(m) {
    const idx = this.members.findIndex(x => x.id === m.id);
    this.members[idx] = m;
    this.save();
  }
}
