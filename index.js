const SUPABASE_URL = 'https://ccpyrrvicpklepidtilo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcHlycnZpY3BrbGVwaWR0aWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3OTI5NTcsImV4cCI6MjA3MDM2ODk1N30.BIsUcuDylm0x7DO32YJ87TuVm6oP2zysEQSCjM-X18s'
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const loginBtn = document.getElementById('login-btn')
const logoutBtn = document.getElementById('logout-btn')
const buttonsContainer = document.getElementById('buttons-container')

async function checkAuth() {
  const {
    data: { session }
  } = await supabase.auth.getSession()
  if (session) {
    loginBtn.style.display = 'none'
    logoutBtn.style.display = 'inline-block'
    loadButtons()
  } else {
    loginBtn.style.display = 'inline-block'
    logoutBtn.style.display = 'none'
    buttonsContainer.innerHTML = '<p>Please login to create tickets.</p>'
  }
}

loginBtn.onclick = async () => {
  await supabase.auth.signInWithOAuth({ provider: 'discord' })
}

logoutBtn.onclick = async () => {
  await supabase.auth.signOut()
  checkAuth()
}

async function loadButtons() {
  const { data: buttons, error } = await supabase.from('buttons').select('*')
  if (error) {
    buttonsContainer.innerHTML = '<p>Error loading buttons.</p>'
    return
  }

  buttonsContainer.innerHTML = ''
  buttons.forEach((btn) => {
    const btnEl = document.createElement('button')
    btnEl.textContent = btn.label
    btnEl.onclick = () => createTicket(btn.id)
    buttonsContainer.appendChild(btnEl)
  })
}

async function createTicket(buttonId) {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) {
    alert('Please login first.')
    return
  }

  const res = await fetch('/functions/create-ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buttonId }),
  })

  if (res.ok) alert('Ticket created!')
  else alert('Failed to create ticket.')
}

checkAuth()
