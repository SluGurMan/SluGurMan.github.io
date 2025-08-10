// Main Homepage Script
class HomePage {
    constructor() {
        this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.services = [];
        this.init();
    }

    async init() {
        await this.loadServices();
        this.setupEventListeners();
    }

    async loadServices() {
        try {
            const { data: services, error } = await this.supabase
                .from(TABLES.SERVICES)
                .select('*')
                .eq('status', 'active')
                .order('name');

            if (error) {
                console.error('Error loading services:', error);
                this.services = DEFAULT_SERVICES;
            } else {
                this.services = services || DEFAULT_SERVICES;
            }

            this.renderServiceButtons();
            this.populateServiceSelects();
        } catch (error) {
            console.error('Error loading services:', error);
            this.services = DEFAULT_SERVICES;
            this.renderServiceButtons();
        }
    }

    renderServiceButtons() {
        const container = document.getElementById('buttonsContainer');
        if (!container) return;

        container.innerHTML = '';

        this.services.forEach(service => {
            const button = document.createElement('button');
            button.className = 'service-btn';
            button.textContent = service.name;
            button.onclick = () => this.createTicket(service);
            container.appendChild(button);
        });
    }

    populateServiceSelects() {
        const serviceSelect = document.getElementById('serviceType');
        if (!serviceSelect) return;

        serviceSelect.innerHTML = '<option value="">Select Service</option>';
        
        this.services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id || service.name;
            option.textContent = service.name;
            serviceSelect.appendChild(option);
        });
    }

    createTicket(service) {
        const serviceSelect = document.getElementById('serviceType');
        if (serviceSelect) {
            serviceSelect.value = service.id || service.name;
        }
        this.openTicketModal();
    }

    setupEventListeners() {
        const ticketForm = document.getElementById('ticketForm');
        if (ticketForm) {
            ticketForm.addEventListener('submit', this.handleTicketSubmit.bind(this));
        }

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('ticketModal');
            if (event.target === modal) {
                this.closeTicketModal();
            }
        });
    }

    async handleTicketSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const ticketData = {
            service_type: document.getElementById('serviceType').value,
            description: document.getElementById('description').value,
            location: document.getElementById('location').value,
            priority: document.getElementById('priority').value,
            status: TICKET_STATUSES.OPEN,
            created_by: authManager.currentUser?.id,
            created_by_discord_id: authManager.currentUser?.user_metadata?.provider_id,
            created_by_username: authManager.currentUser?.user_metadata?.full_name || 'Unknown',
            created_at: new Date().toISOString()
        };

        try {
            const { data, error } = await this.supabase
                .from(TABLES.TICKETS)
                .insert([ticketData])
                .select();

            if (error) throw error;

            // Send Discord webhook notification
            await this.sendWebhookNotification(ticketData, data[0]);

            // Show success message
            alert('Ticket created successfully!');
            this.closeTicketModal();
            event.target.reset();

        } catch (error) {
            console.error('Error creating ticket:', error);
            alert('Error creating ticket: ' + error.message);
        }
    }

    async sendWebhookNotification(ticketData, createdTicket) {
        try {
            // Find the service and its webhook
            const service = this.services.find(s => 
                (s.id && s.id.toString() === ticketData.service_type) || 
                s.name === ticketData.service_type
            );

            if (!service || !service.webhook_url) {
                console.log('No webhook configured for service:', ticketData.service_type);
                return;
            }

            const embed = {
                title: '🚨 New Emergency Ticket',
                color: this.getPriorityColor(ticketData.priority),
                fields: [
                    {
                        name: '🏷️ Ticket ID',
                        value: `#${createdTicket.id}`,
                        inline: true
                    },
                    {
                        name: '🚑 Service',
                        value: service.name,
                        inline: true
                    },
                    {
                        name: '⚠️ Priority',
                        value: ticketData.priority.toUpperCase(),
                        inline: true
                    },
                    {
                        name: '📋 Description',
                        value: ticketData.description,
                        inline: false
                    },
                    {
                        name: '📍 Location',
                        value: ticketData.location,
                        inline: false
                    },
                    {
                        name: '👤 Created By',
                        value: ticketData.created_by_username,
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Emergency Services Portal'
                }
            };

            // Add role ping if configured
            let content = '';
            if (service.discord_role) {
                content = service.discord_role;
            }

            const webhookPayload = {
                content: content,
                embeds: [embed]
            };

            await fetch(service.webhook_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhookPayload)
            });

        } catch (error) {
            console.error('Error sending webhook notification:', error);
        }
    }

    getPriorityColor(priority) {
        const colors = {
            'critical': 0xFF0000, // Red
            'high': 0xFF8000,     // Orange
            'medium': 0xFFFF00,   // Yellow
            'low': 0x00FF00       // Green
        };
        return colors[priority] || 0x0099FF;
    }

    openTicketModal() {
        const modal = document.getElementById('ticketModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeTicketModal() {
        const modal = document.getElementById('ticketModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Global functions for modal control
function openTicketModal() {
    if (window.homePage) {
        window.homePage.openTicketModal();
    }
}

function closeTicketModal() {
    if (window.homePage) {
        window.homePage.closeTicketModal();
    }
}

// Initialize homepage when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to initialize first
    setTimeout(() => {
        if (authManager && authManager.currentUser) {
            window.homePage = new HomePage();
        } else {
            // Retry after a short delay
            setTimeout(() => {
                if (authManager && authManager.currentUser) {
                    window.homePage = new HomePage();
                }
            }, 1000);
        }
    }, 500);
});
