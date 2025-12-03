function MemberRepo() {
  this.storageKey = 'LIB_MEMBERS';

  this.getAll = function () {
    return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  };

  this.add = function (member) {
    const members = this.getAll();
    members.push(member);
    localStorage.setItem(this.storageKey, JSON.stringify(members));
  };

  this.find = function (id) {
    return this.getAll().find(m => m.id === id);
  };

  this.update = function (member) {
    const members = this.getAll().map(m => (m.id === member.id ? member : m));
    localStorage.setItem(this.storageKey, JSON.stringify(members));
  };
}
