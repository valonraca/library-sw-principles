export class LocalStorageMemberRepository {
  constructor(key = 'LIB_DATA') {
    this.key = key;
    this._load();
  }

  _load() {
    try {
      const payload = JSON.parse(localStorage.getItem(this.key) || '{}');
      this.members = payload.members || [];
    } catch (e) {
      this.members = [];
    }
  }

  _commit() {
    const payload = JSON.parse(localStorage.getItem(this.key) || '{}');
    payload.members = this.members;
    localStorage.setItem(this.key, JSON.stringify(payload));
  }

  getAll() {
    return this.members.slice();
  }

  findById(id) {
    return this.members.find(m => m.id === id);
  }

  save(member) {
    const idx = this.members.findIndex(m => m.id === member.id);
    if (idx >= 0) this.members[idx] = member;
    else this.members.push(member);
    this._commit();
  }

  update(member) {
    const idx = this.members.findIndex(m => m.id === member.id);
    if (idx >= 0) this.members[idx] = member;
    else this.members.push(member);
    this._commit();
  }

  clear() {
    this.members = [];
    const payload = JSON.parse(localStorage.getItem(this.key) || '{}');
    payload.members = [];
    localStorage.setItem(this.key, JSON.stringify(payload));
  }
}