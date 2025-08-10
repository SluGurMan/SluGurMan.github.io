// Tickets Management Script
class TicketsManager {
    constructor() {
        this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.tickets = [];
        this.services = [];
        this.currentAction = null;
        this.currentTicket = null;
        this.init();
    }

    async init() {
        // Check access permission
        if (!checkPageAccess(PERMISSIONS.VIEW_TICKETS)) {
            return;
        }

        await this.loadServices();
        await this.loadTickets();
        this.setupEventListeners();
        this.setupFilters();
    }

    async loadServices() {
        try {
            const { data: services, error } = await this.supabase
                .from(TABLES.SERVICES)
                .select('*')
                .eq('status', 'active')
                .order('name');

            if (error) throw error;
            this.services = services || [];
            this.populateServiceFilter();
        } catch (error) {
            console.error('Error loading services:', error);
            this.services = DEFAULT_SERVICES;
            this.populateServiceFilter();
        }
    }

    async loadTickets() {
        try {
            let query = this.supabase
                .from(TABLES.TICKETS)
                .select('*')
                .order('created_at', { ascending: false });

            // Apply role-based filtering
            const userPermissions = authManager.userPermissions;
            const discordId = authManager.currentUser?.user_metadata?.provider_id;

            // If user is not admin, filter tickets based on their service access
            if (!isAdmin()) {
                const { data: staffMember, error } = await this.supabase
                    .from(TABLES.STAFF)
                    .select(`
                        *,
                        roles:role_id (
                            *,
                            service_access
                        )
                    `)
                    .eq('discord_id', discordId)
                    .single();

                if (staffMember && staffMember.roles?.service_access) {
                    const allowedServices = staffMember.roles.service_access;
                    query = query.in('service_type', allowedServices);
                }
            }

            const { data: tickets, error } = await query;

            if (error) throw error;
            
            this.tickets = tickets || [];
            this.renderTickets();
            this.updateStats();

        } catch (error) {
            console.error('Error loading tickets:', error);
            this.tickets = [];
            this.renderTickets();
        }
    }

    renderTickets() {
        const grid = document.getElementById('ticketsGrid');
        const noTickets = document.getElementById('noTickets');
        
        if (!grid) return;

        // Apply filters
        const filteredTickets = this.applyFilters();

        if (filteredTickets.length === 0) {
            grid.innerHTML = '';
            if (noTickets) noTickets.classList.remove('hidden');
            return;
        }

        if (noTickets) noTickets.classList.add('hidden');

        grid.innerHTML = '';
        
        filteredTickets.forEach(ticket => {
            const ticketCard = this.createTicketCard(ticket);
            grid.appendChild(ticketCard);
        });
    }

    createTicketCard(ticket) {
        const card = document.createElement('div');
        card.className = `ticket-card priority-${ticket.priority}`;
        
        const service = this.services.find(s => 
            (s.id && s.id.toString() === ticket.service_type) || 
            s.name === ticket.service_type
        );
        
        const serviceName = service ? service.name : ticket.service_type;
        
        card.innerHTML = `
            <div class="ticket-header">
                <div class="ticket-id">#${ticket.id}</div>
                <div class="priority-badge priority-${ticket.priority}">
                    ${ticket.priority}
                </div>
            </div>
            <div class="ticket-service">${serviceName}</div>
            <div class="ticket-description">${ticket.description}</div>
            <div class="ticket-details">
                <div><strong>Location:</strong> ${ticket.location}</div>
                <div><strong>Created:</strong> ${new Date(ticket.created_at).toLocaleString()}</div>
                <div><strong>Created by:</strong> ${ticket.created_by_username || 'Unknown'}</div>
                <div><strong>Status:</strong> 
                    <span class="status-badge status-${ticket.status}">${ticket.status}</span>
                </div>
            </div>
            <div class="ticket-actions">
                ${this.generateActionButtons(ticket)}
            </div>
        `;
        
        return card;
    }

    generateActionButtons(ticket) {
        let buttons = [];
        
        // View button (always available)
        buttons.push(`<button class="btn btn-view" onclick="ticketsManager.viewTicket(${ticket.id})">View</button>`);
        
        // Status-based action buttons
        if (ticket.status === TICKET_STATUSES.OPEN) {
            if (hasPermission(PERMISSIONS.ACCEPT_TICKETS)) {
                buttons.push(`<button class="btn btn-accept" onclick="ticketsManager.acceptTicket(${ticket.id})">Accept</button>`);
            }
            if (hasPermission(PERMISSIONS.DENY_TICKETS)) {
                buttons.push(`<button class="btn btn-deny" onclick="ticketsManager.denyTicket(${ticket.id})">Deny</button>`);
            }
        }
        
        // Close button (for accepted tickets)
        if (ticket.status === TICKET_STATUSES.ACCEPTED && hasPermission(PERMISSIONS.CLOSE_TICKETS)) {
            buttons.push(`<button class="btn btn-close" onclick="ticketsManager.closeTicket(${ticket.id})">Close</button>`);
        }
        
        return buttons.join('');
    }

    applyFilters() {
        let filtered = [...this.tickets];
        
        const serviceFilter = document.getElementById('serviceFilter')?.value;
        const statusFilter = document.getElementById('statusFilter')?.value;
        const priorityFilter = document.getElementById('priorityFilter')?.value;
        const dateFilter = document.getElementById('dateFilter')?.value;
        
        if (serviceFilter) {
            filtered = filtered.filter(ticket => 
                ticket.service_type === serviceFilter ||
                this.services.find(s => s.name === serviceFilter && 
                    (s.id?.toString() === ticket.service_type || s.name === ticket.service_type))
            );
        }
        
        if (statusFilter) {
            filtered = filtered.filter(ticket => ticket.status === statusFilter);
        }
        
        if (priorityFilter) {
            filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
        }
        
        if (dateFilter) {
            filtered = filtered.filter(ticket => {
                const ticketDate = new Date(ticket.created_at).toDateString();
                const filterDate = new Date(dateFilter).toDateString();
                return ticketDate === filterDate;
            });
        }
        
        return filtered;
    }

    updateStats() {
        const stats = this.tickets.reduce((acc, ticket) => {
            acc.total++;
            acc[ticket.status] = (acc[ticket.status] || 0) + 1;
            return acc;
        }, { total: 0, open: 0, accepted: 0, closed: 0, denied: 0 });

        document.getElementById('openCount').textContent = stats.open || 0;
        document.getElementById('acceptedCount').textContent = stats.accepted || 0;
        document.getElementById('closedCount').textContent = (stats.closed || 0) + (stats.denied || 0);
        document.getElementById('totalCount').textContent = stats.total || 0;
    }

    populateServiceFilter() {
        const serviceFilter = document.getElementById('serviceFilter');
        if (!serviceFilter) return;

        serviceFilter.innerHTML = '<option value="">All Services</option>';
        
        this.services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            option.textContent = service.name;
            serviceFilter.appendChild(option);
        });
    }

    setupFilters() {
        const filters = ['serviceFilter', 'statusFilter', 'priorityFilter', 'dateFilter'];
        
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => this.renderTickets());
            }
        });
    }

    setupEventListeners() {
        const actionForm = document.getElementById('ticketActionForm');
        if (actionForm) {
            actionForm.addEventListener('submit', this.handleActionSubmit.bind(this));
        }

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('ticketActionModal');
            if (event.target === modal) {
                this.closeActionModal();
            }
        });
    }

    async acceptTicket(ticketId) {
        this.currentAction = 'accept';
        this.currentTicket = ticketId;
        this.openActionModal('Accept Ticket', 'Accept');
    }

    async denyTicket(ticketId) {
        this.currentAction = 'deny';
        this.currentTicket = ticketId;
        this.openActionModal('Deny Ticket', 'Deny');
    }

    async closeTicket(ticketId) {
        this.currentAction = 'close';
        this.currentTicket = ticketId;
        this.openActionModal('Close Ticket', 'Close');
    }

    async viewTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        // Create a detailed view modal or redirect to detailed page
        alert(`Ticket #${ticketId}\n\nService: ${ticket.service_type}\nDescription: ${ticket.description}\nLocation: ${ticket.location}\nPriority: ${ticket.priority}\nStatus: ${ticket.status}\nCreated: ${new Date(ticket.created_at).toLocaleString()}\nCreated by: ${ticket.created_by_username}`);
    }

    openActionModal(title, buttonText) {
        const modal = document.getElementById('ticketActionModal');
        const titleEl = document.getElementById('actionModalTitle');
        const submitBtn = document.getElementById('actionSubmitBtn');
        
        if (titleEl) titleEl.textContent = title;
        if (submitBtn) {
            submitBtn.textContent = buttonText;
            submitBtn.className = `btn btn-${this.currentAction === 'accept' ? 'success' : this.currentAction === 'deny' ? 'danger' : 'close'}`;
        }
        
        if (modal) modal.style.display = 'block';
    }

    closeActionModal() {
        const modal = document.getElementById('ticketActionModal');
        const form = document.getElementById('ticketActionForm');
        
        if (modal) modal.style.display = 'none';
        if (form) form.reset();
        
        this.currentAction = null;
        this.currentTicket = null;
    }

    async handleActionSubmit(event) {
        event.preventDefault();
        
        if (!this.currentTicket || !this.currentAction) return;

        const notes = document.getElementById('actionNotes').value;
        
        try {
            const newStatus = this.currentAction === 'accept' ? TICKET_STATUSES.ACCEPTED :
                            this.currentAction === 'deny' ? TICKET_STATUSES.DENIED :
                            TICKET_STATUSES.CLOSED;

            // Update ticket status
            const { error: updateError } = await this.supabase
                .from(TABLES.TICKETS)
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentTicket);

            if (updateError) throw updateError;

            // Log the action
            const { error: logError } = await this.supabase
                .from(TABLES.TICKET_ACTIONS)
                .insert([{
                    ticket_id: this.currentTicket,
                    action: this.currentAction,
                    notes: notes,
                    performed_by: authManager.currentUser?.id,
                    performed_by_discord_id: authManager.currentUser?.user_metadata?.provider_id,
                    performed_by_username: authManager.currentUser?.user_metadata?.full_name || 'Unknown',
                    performed_at: new Date().toISOString()
                }]);

            if (logError) console.error('Error logging action:', logError);

            // Send webhook notification
            await this.sendActionWebhook();

            // If closing ticket, delete it after a delay
            if (newStatus === TICKET_STATUSES.CLOSED) {
                setTimeout(async () => {
                    await this.deleteTicket(this.currentTicket);
                }, 5000); // 5 second delay before deletion
            }

            alert(`Ticket ${this.currentAction}ed successfully!`);
            this.closeActionModal();
            await this.loadTickets(); // Reload tickets

        } catch (error) {
            console.error('Error updating ticket:', error);
            alert('Error updating ticket: ' + error.message);
        }
    }

    async sendActionWebhook() {
        try {
            const ticket = this.tickets.find(t => t.id === this.currentTicket);
            if (!ticket) return;

            const service = this.services.find(s => 
                (s.id && s.id.toString() === ticket.service_type) || 
                s.name === ticket.service_type
            );

            if (!service || !service.webhook_url) return;

            const actionEmojis = {
                'accept': '✅',
                'deny': '❌',
                'close': '🔒'
            };

            const actionColors = {
                'accept': 0x00FF00,
                'deny': 0xFF0000,
                'close': 0x808080
            };

            const embed = {
                title: `${actionEmojis[this.currentAction]} Ticket ${this.currentAction.charAt(0).toUpperCase() + this.currentAction.slice(1)}ed`,
                color: actionColors[this.currentAction],
                fields: [
                    {
                        name: '🏷️ Ticket ID',
                        value: `#${ticket.id}`,
                        inline: true
                    },
                    {
                        name: '🚑 Service',
                        value: service.name,
                        inline: true
                    },
                    {
                        name: '👤 Action By',
                        value: authManager.currentUser?.user_metadata?.full_name || 'Unknown',
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Emergency Services Portal'
                }
            };

            const notes = document.getElementById('actionNotes').value;
            if (notes) {
                embed.fields.push({
                    name: '📝 Notes',
                    value: notes,
                    inline: false
                });
            }

            await fetch(service.webhook_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ embeds: [embed] })
            });

        } catch (error) {
            console.error('Error sending action webhook:', error);
        }
    }

    async deleteTicket(ticketId) {
        try {
            // Delete associated actions first
            await this.supabase
                .from(TABLES.TICKET_ACTIONS)
                .delete()
                .eq('ticket_id', ticketId);

            // Delete the ticket
            const { error } = await this.supabase
                .from(TABLES.TICKETS)
                .delete()
                .eq('id', ticketId);

            if (error) throw error;

            console.log(`Ticket #${ticketId} deleted successfully`);
            await this.loadTickets(); // Reload tickets

        } catch (error) {
            console.error('Error deleting ticket:', error);
        }
    }
}

// Global functions
function closeActionModal() {
    if (window.ticketsManager) {
        window.ticketsManager.closeActionModal();
    }
}

async function loadTickets() {
    if (window.ticketsManager) {
        await window.ticketsManager.loadTickets();
    }
}

// Initialize tickets manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (authManager && authManager.currentUser) {
            window.ticketsManager = new TicketsManager();
        }
    }, 500);
});
