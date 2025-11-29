export class LocalStorageMemberRepo {
  constructor(key = "LIB_MEMBERS") {
    this.key = key;
    this.members = JSON.parse(localStorage.getItem(key) || "[]");
  }

  save(member) {
    this.members.push(member);
    this._persist();
  }

  update(member) {
    this.members = this.members.map(m => (m.id === member.id ? member : m));
    this._persist();
  }

  find(id) {
    return this.members.find(m => m.id === id);
  }

  all() {
    return [...this.members];
  }

  _persist() {
    localStorage.setItem(this.key, JSON.stringify(this.members));
  }
}
