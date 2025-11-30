class MemberRepo {
  constructor(storage) {
    this.storage = storage;
    const data = storage.load();
    this.members = data.members || [];
  }

  getAll() {
    return this.members;
  }

  add(member) {
    this.members.push(member);
    this._save();
  }

  getById(id) {
    return this.members.find(m => m.id === id);
  }

  update(member) {
    const idx = this.members.findIndex(m => m.id === member.id);
    if (idx !== -1) {
      this.members[idx] = member;
      this._save();
    }
  }

  _save() {
    this.storage.save({ members: this.members });
  }
}
