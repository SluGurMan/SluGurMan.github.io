import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState(null);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(r => setUser(r.data.session?.user ?? null));
    fetchTypes();
    const sub = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function fetchTypes() {
    setLoading(true);
    const { data } = await supabase.from('ticket_types').select('*').order('order');
    setTypes(data ?? []);
    setLoading(false);
  }

  async function openTicket(type) {
    if (!user) {
      return supabase.auth.signInWithOAuth({ provider: 'discord' });
    }
    const { data } = await supabase.from('tickets').insert([{ ticket_type_id: type.id, created_by: user.id, description: 'Opened via web' }]).select().single();
    // call server api to post webhook (so service role key is used)
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticketId: data.id })
    });
    // go to ticket view
    window.location.href = `/tickets/${data.id}`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-3xl text-center p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">FiveM Ticket Portal</h1>
          <p className="text-sm text-gray-600">Sign in with Discord to open a ticket</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {loading ? <p>Loading...</p> : types.map(t => (
            <button key={t.id} onClick={() => openTicket(t)}
              className="p-4 rounded-lg shadow bg-white hover:scale-105 transition">
              <div className="font-semibold">{t.name}</div>
              <div className="text-sm text-gray-500">{t.description}</div>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <Link href="/admin"><a className="text-sm text-blue-600">Admin Panel</a></Link>
        </div>
      </div>
    </div>
  );
}
