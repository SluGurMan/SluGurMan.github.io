import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { ticketId } = req.body;
  if (!ticketId) return res.status(400).json({ error: 'missing ticketId' });

  // fetch ticket and ticket type info
  const { data: ticket } = await supabaseAdmin.from('tickets').select('*').eq('id', ticketId).single();
  if (!ticket) return res.status(404).json({ error: 'ticket not found' });

  const { data: ttype } = await supabaseAdmin.from('ticket_types').select('*').eq('id', ticket.ticket_type_id).single();
  // optional: fetch creator info
  const { data: creator } = await supabaseAdmin.from('profiles').select('*').eq('id', ticket.created_by).single();

  // post to webhook if exists
  if (ttype?.discord_webhook) {
    try {
      const body = {
        content: ttype.ping_role_id ? `<@&${ttype.ping_role_id}>` : undefined,
        embeds: [
          {
            title: `New ticket — ${ttype.name}`,
            description: ticket.description || 'No description',
            fields: [
              { name: 'Ticket ID', value: ticket.id },
              { name: 'Created by', value: creator ? creator.display_name ?? creator.id : ticket.created_by }
            ],
            timestamp: new Date().toISOString()
          }
        ]
      };

      await fetch(ttype.discord_webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (err) {
      console.error('webhook failed', err);
    }
  }

  res.json({ ok: true });
}
