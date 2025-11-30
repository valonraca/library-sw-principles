export function renderInventory(list) {
  return `
    <h3>Inventory</h3>
    <ul>
      ${list
        .map(
          b =>
            `<li><strong>${b.available ? "✓" : "✗"}</strong> ${b.id}: ${b.title} — ${b.author}</li>`
        )
        .join("")}
    </ul>`;
}

export function renderMember(member) {
  if (!member) return `<em>No member selected.</em>`;
  return `
    <h3>${member.name}</h3>
    <p>${member.email}</p>
    <p>Fees: $${member.fees}</p>
  `;
}
