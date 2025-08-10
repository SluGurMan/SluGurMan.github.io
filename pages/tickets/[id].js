import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function TicketView() {
  const router = useRouter();
  const { id } = router.query;
  const [ticket, setTicket] = useState(null);
  useEffect(()=>{ if (id) fetch(); }, [id]);

  async function fetch(){
    const { data } = await supabase.from('tickets').select('*,ticket_types(*)').eq('id', id).single();
    setTicket(data);
  }

  async function closeAndDelete() {
    if (!confirm('Delete ticket permanently?')) return;
    await supabase.from('tickets').delete().eq('id', id);
    alert('Ticket deleted.');
    router.push('/');
  }

  if (!ticket) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded">
      <h2 className="text-lg font-semibold">{ticket.ticket_types?.name}</h2>
      <div className="text-sm text-gray-600 mt-2">Created: {new Date(ticket.created_at).toLocaleString()}</div>
      <div className="mt-4">{ticket.description}</div>

      <div className="mt-6 flex gap-2">
        <button onClick={closeAndDelete} className="px-4 py-2 bg-red-600 text-white rounded">Close & Delete</button>
      </div>
    </div>
  );
}
