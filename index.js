// public/index.js
const API_BASE = '/api'; // adjust if needed

// Login handler
document.getElementById('login-btn').addEventListener('click', () => {
  window.location.href = `${API_BASE}/auth/discord`;
});

// Fetch and render service buttons
async function loadButtons() {
  const res = await fetch(`${API_BASE}/buttons`);
  const buttons = await res.json();

  const container = document.getElementById('buttons-container');
  container.innerHTML = '';

  buttons.forEach(btn => {
    const el = document.createElement('button');
    el.textContent = btn.label;
    el.addEventListener('click', () => openTicket(btn.id));
    container.appendChild(el);
  });
}

async function openTicket(buttonId) {
  const res = await fetch(`${API_BASE}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buttonId })
  });

  if (res.ok) {
    alert('Ticket created successfully!');
  } else {
    alert('Failed to create ticket');
  }
}

loadButtons();
