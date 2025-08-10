// Supabase Configuration
const SUPABASE_URL = 'https://ccpyrrvicpklepidtilo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcHlycnZpY3BrbGVwaWR0aWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3OTI5NTcsImV4cCI6MjA3MDM2ODk1N30.BIsUcuDylm0x7DO32YJ87TuVm6oP2zysEQSCjM-X18s';

// Discord Configuration
const DISCORD_CLIENT_ID = '1054937540651647066';
const DISCORD_CLIENT_SECRET = 'PsHIfZnoWvyg7DzBWIwKpXtwuVGGF2sa';

// Admin Configuration
const ADMIN_DISCORD_ID = '821445289477931069'; // Your Discord ID for admin access

// Default Services (will be loaded from database, but these are fallbacks)
const DEFAULT_SERVICES = [
    {
        name: 'Police',
        discord_role: '@Police',
        webhook_url: '',
        description: 'Police emergency services'
    },
    {
        name: 'UHS',
        discord_role: '@UHS',
        webhook_url: '',
        description: 'Unmatched Health Services'
    },
    {
        name: 'Fire',
        discord_role: '@Fire',
        webhook_url: '',
        description: 'Fire emergency services'
    },
    {
        name: 'Coastguard',
        discord_role: '@Coastguard',
        webhook_url: '',
        description: 'Coastguard emergency services'
    },
    {
        name: 'Highways',
        discord_role: '@Highways',
        webhook_url: '',
        description: 'Highway emergency services'
    }
];

// Permission Levels
const PERMISSIONS = {
    VIEW_TICKETS: 'view_tickets',
    ACCEPT_TICKETS: 'accept_tickets',
    DENY_TICKETS: 'deny_tickets',
    CLOSE_TICKETS: 'close_tickets',
    ADMIN_PANEL: 'admin_panel',
    MANAGE_STAFF: 'manage_staff',
    MANAGE_ROLES: 'manage_roles',
    MANAGE_SERVICES: 'manage_services'
};

// Priority Levels
const PRIORITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

// Ticket Statuses
const TICKET_STATUSES = {
    OPEN: 'open',
    ACCEPTED: 'accepted',
    DENIED: 'denied',
    CLOSED: 'closed'
};

// Database Table Names
const TABLES = {
    TICKETS: 'tickets',
    SERVICES: 'services',
    ROLES: 'roles',
    STAFF: 'staff',
    WEBHOOKS: 'webhooks',
    TICKET_ACTIONS: 'ticket_actions'
};

// Webhook Templates
const WEBHOOK_TEMPLATES = {
    NEW_TICKET: {
        title: 'New Emergency Ticket',
        color: 0xFF0000,
        description: 'A new emergency ticket has been created'
    },
    TICKET_ACCEPTED: {
        title: 'Ticket Accepted',
        color: 0x00FF00,
        description: 'An emergency ticket has been accepted'
    },
    TICKET_DENIED: {
        title: 'Ticket Denied',
        color: 0xFF0000,
        description: 'An emergency ticket has been denied'
    },
    TICKET_CLOSED: {
        title: 'Ticket Closed',
        color: 0x808080,
        description: 'An emergency ticket has been closed'
    }
};

// API Endpoints
const API_ENDPOINTS = {
    DISCORD_USER: 'https://discord.com/api/users/@me',
    DISCORD_WEBHOOK_TEST: '/webhooks/test'
};
