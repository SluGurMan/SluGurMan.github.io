// Admin Panel Script
class AdminPanel {
    constructor() {
        this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.services = [];
        this.roles = [];
        this.staff = [];
        this.webhooks = [];
        this.currentEditId = null;
        this.init();
    }

    async init() {
        // Check admin access
        if (!checkPageAccess(PERMISSIONS.ADMIN_PANEL)) {
            return;
        }

        await this.loadAllData();
        this.setupEventListeners();
        await this.initializeDefaultData();
    }

    async loadAllData() {
        await Promise.all([
            this.loadServices(),
            this.loadRoles(),
            this.loadStaff(),
            this.loadWebhooks()
        ]);
    }

    async initializeDefaultData() {
        // Create default services if none exist
        if (this.services.length === 0) {
            for (const service of DEFAULT_SERVICES) {
                await this.createService(service, false);
            }
            await this.loadServices();
        }

        // Create default admin role if none exist
        if (this.roles.length === 0) {
            await this.createDefaultAdminRole();
            await this.loadRoles();
        }
    }

    async createDefaultAdminRole() {
        const adminRole = {
            name: 'Admin',
            permissions: Object.values(PERMISSIONS),
            service_access: this.services.map(s => s.name),
            status: 'active'
        };

        await this.supabase.from(TABLES.ROLES).insert([adminRole]);
    }

    // Services Management
    async loadServices() {
        try {
            const { data, error } = await this.supabase
                .from(TABLES.SERVICES)
                .select('*')
                .order('name');

            if (error) throw error;
            this.services = data || [];
            this.renderServicesTable();
        } catch (error) {
            console.error('Error loading services:', error);
        }
    }

    renderServicesTable() {
        const tbody = document.getElementById('servicesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.services.forEach(service => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${service.name}</td>
                <td>${service.discord_role || 'Not set'}</td>
                <td>${service.webhook_url ? 'Configured' : 'Not set'}</td>
                <td><span class="status-badge status-${service.status || 'active'}">${service.status || 'active'}</span></td>
                <td>
                    <button class="btn" onclick="adminPanel.editService(${service.id})">Edit</button>
                    <button class="btn btn-danger" onclick="adminPanel.deleteService(${service.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async createService(serviceData, reload = true) {
        try {
            const { data, error } = await this.supabase
                .from(TABLES.SERVICES)
                .insert([{
                    name: serviceData.name || serviceData.serviceName,
                    discord_role: serviceData.discord_role || serviceData.discordRole,
                    webhook_url: serviceData.webhook_url || serviceData.webhookUrl,
                    description: serviceData.description || serviceData.serviceDescription,
                    status: 'active'
                }]);

            if (error) throw error;
            if (reload) await this.loadServices();
            return true;
        } catch (error) {
            console.error('Error creating service:', error);
            return false;
        }
    }

    async editService(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;

        this.currentEditId = serviceId;
        
        // Populate form with current data
        document.getElementById('serviceName').value = service.name || '';
        document.getElementById('discordRole').value = service.discord_role || '';
        document.getElementById('webhookUrl').value = service.webhook_url || '';
        document.getElementById('serviceDescription').value = service.description || '';
        
        this.openServiceModal();
    }

    async deleteService(serviceId) {
        if (!confirm('Are you sure you want to delete this service?')) return;

        try {
            const { error } = await this.supabase
                .from(TABLES.SERVICES)
                .delete()
                .eq('id', serviceId);

            if (error) throw error;
            await this.loadServices();
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Error deleting service: ' + error.message);
        }
    }

    // Roles Management
    async loadRoles() {
        try {
            const { data, error } = await this.supabase
                .from(TABLES.ROLES)
                .select('*')
                .order('name');

            if (error) throw error;
            this.roles = data || [];
            this.renderRolesTable();
            this.populateRoleSelects();
        } catch (error) {
            console.error('Error loading roles:', error);
        }
    }

    renderRolesTable() {
        const tbody = document.getElementById('rolesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.roles.forEach(role => {
            const row = document.createElement('tr');
            const permissions = Array.isArray(role.permissions) ? role.permissions.join(', ') : 'None';
            const serviceAccess = Array.isArray(role.service_access) ? role.service_access.join(', ') : 'None';
            
            row.innerHTML = `
                <td>${role.name}</td>
                <td><small>${permissions}</small></td>
                <td><small>${serviceAccess}</small></td>
                <td><span class="status-badge status-${role.status || 'active'}">${role.status || 'active'}</span></td>
                <td>
                    <button class="btn" onclick="adminPanel.editRole(${role.id})">Edit</button>
                    <button class="btn btn-danger" onclick="adminPanel.deleteRole(${role.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    populateRoleSelects() {
        const staffRoleSelect = document.getElementById('staffRole');
        if (staffRoleSelect) {
            staffRoleSelect.innerHTML = '<option value="">Select Role</option>';
            this.roles.forEach(role => {
                const option = document.createElement('option');
                option.value = role.id;
                option.textContent = role.name;
                staffRoleSelect.appendChild(option);
            });
        }
    }

    async createRole(roleData) {
        try {
            const permissions = [];
            const serviceAccess = [];

            // Collect selected permissions
            document.querySelectorAll('#permissionsGroup input[type="checkbox"]:checked').forEach(cb => {
                permissions.push(cb.value);
            });

            // Collect selected service access
            document.querySelectorAll('#serviceAccessGroup input[type="checkbox"]:checked').forEach(cb => {
                serviceAccess.push(cb.value);
            });

            const { data, error } = await this.supabase
                .from(TABLES.ROLES)
                .insert([{
                    name: roleData.name,
                    permissions: permissions,
                    service_access: serviceAccess,
                    status: 'active'
                }]);

            if (error) throw error;
            await this.loadRoles();
            return true;
        } catch (error) {
            console.error('Error creating role:', error);
            return false;
        }
    }

    async editRole(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        if (!role) return;

        this.currentEditId = roleId;
        
        // Populate form with current data
        document.getElementById('roleName').value = role.name || '';
        
        // Clear and populate permissions
        document.querySelectorAll('#permissionsGroup input[type="checkbox"]').forEach(cb => {
            cb.checked = Array.isArray(role.permissions) && role.permissions.includes(cb.value);
        });

        // Populate service access after loading services
        this.populateServiceAccessCheckboxes();
        setTimeout(() => {
            document.querySelectorAll('#serviceAccessGroup input[type="checkbox"]').forEach(cb => {
                cb.checked = Array.isArray(role.service_access) && role.service_access.includes(cb.value);
            });
        }, 100);
        
        this.openRoleModal();
    }

    async deleteRole(roleId) {
        if (!confirm('Are you sure you want to delete this role?')) return;

        try {
            const { error } = await this.supabase
                .from(TABLES.ROLES)
                .delete()
                .eq('id', roleId);

            if (error) throw error;
            await this.loadRoles();
        } catch (error) {
            console.error('Error deleting role:', error);
            alert('Error deleting role: ' + error.message);
        }
    }

    populateServiceAccessCheckboxes() {
        const container = document.getElementById('serviceAccessGroup');
        if (!container) return;

        container.innerHTML = '';
        
        this.services.forEach(service => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            div.innerHTML = `
                <input type="checkbox" id="service_${service.id}" value="${service.name}">
                <label for="service_${service.id}">${service.name}</label>
            `;
            container.appendChild(div);
        });
    }

    // Staff Management
    async loadStaff() {
        try {
            const { data, error } = await this.supabase
                .from(TABLES.STAFF)
                .select(`
                    *,
                    roles:role_id (
                        id,
                        name
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.staff = data || [];
            this.renderStaffTable();
        } catch (error) {
            console.error('Error loading staff:', error);
        }
    }

    renderStaffTable() {
        const tbody = document.getElementById('staffTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.staff.forEach(member => {
            const row = document.createElement('tr');
            const roleName = member.roles ? member.roles.name : 'No Role';
            
            row.innerHTML = `
                <td>${member.username}</td>
                <td><code>${member.discord_id}</code></td>
                <td>${roleName}</td>
                <td><span class="status-badge status-${member.status || 'active'}">${member.status || 'active'}</span></td>
                <td>${new Date(member.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn" onclick="adminPanel.editStaff(${member.id})">Edit</button>
                    <button class="btn btn-danger" onclick="adminPanel.removeStaff(${member.id})">Remove</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async createStaff(staffData) {
        try {
            const { data, error } = await this.supabase
                .from(TABLES.STAFF)
                .insert([{
                    discord_id: staffData.discord_id,
                    username: staffData.username,
                    role_id: staffData.role_id,
                    status: 'active',
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;
            await this.loadStaff();
            return true;
        } catch (error) {
            console.error('Error creating staff:', error);
            return false;
        }
    }

    async editStaff(staffId) {
        const staff = this.staff.find(s => s.id === staffId);
        if (!staff) return;

        this.currentEditId = staffId;
        
        document.getElementById('staffDiscordId').value = staff.discord_id || '';
        document.getElementById('staffUsername').value = staff.username || '';
        document.getElementById('staffRole').value = staff.role_id || '';
        
        this.openStaffModal();
    }

    async removeStaff(staffId) {
        if (!confirm('Are you sure you want to remove this staff member?')) return;

        try {
            const { error } = await this.supabase
                .from(TABLES.STAFF)
                .delete()
                .eq('id', staffId);

            if (error) throw error;
            await this.loadStaff();
        } catch (error) {
            console.error('Error removing staff:', error);
            alert('Error removing staff: ' + error.message);
        }
    }

    // Webhooks Management
    async loadWebhooks() {
        try {
            const { data, error } = await this.supabase
                .from(TABLES.WEBHOOKS)
                .select('*')
                .order('service');

            if (error) throw error;
            this.webhooks = data || [];
            this.renderWebhooksTable();
        } catch (error) {
            console.error('Error loading webhooks:', error);
        }
    }

    renderWebhooksTable() {
        const tbody = document.getElementById('webhooksTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.webhooks.forEach(webhook => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${webhook.service}</td>
                <td><small>${webhook.url ? webhook.url.substring(0, 50) + '...' : 'Not set'}</small></td>
                <td><span class="status-badge status-${webhook.status || 'active'}">${webhook.status || 'active'}</span></td>
                <td>${webhook.last_test ? new Date(webhook.last_test).toLocaleString() : 'Never'}</td>
                <td>
                    <button class="btn" onclick="adminPanel.testWebhook(${webhook.id})">Test</button>
                    <button class="btn" onclick="adminPanel.editWebhook(${webhook.id})">Edit</button>
                    <button class="btn btn-danger" onclick="adminPanel.deleteWebhook(${webhook.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async testWebhook(webhookId) {
        try {
            const webhook = this.webhooks.find(w => w.id === webhookId);
            if (!webhook || !webhook.url) return;

            const testEmbed = {
                title: '🧪 Webhook Test',
                description: 'This is a test message from the Emergency Services Portal',
                color: 0x0099FF,
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Emergency Services Portal - Test Message'
                }
            };

            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    embeds: [testEmbed]
                })
            });

            if (response.ok) {
                // Update last test time
                await this.supabase
                    .from(TABLES.WEBHOOKS)
                    .update({ last_test: new Date().toISOString() })
                    .eq('id', webhookId);

                alert('Webhook test successful!');
                await this.loadWebhooks();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.error('Error testing webhook:', error);
            alert('Webhook test failed: ' + error.message);
        }
    }

    async testWebhooks() {
        for (const webhook of this.webhooks) {
            await this.testWebhook(webhook.id);
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between tests
        }
    }

    // Modal Management
    setupEventListeners() {
        // Service Form
        const serviceForm = document.getElementById('serviceForm');
        if (serviceForm) {
            serviceForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    serviceName: document.getElementById('serviceName').value,
                    discordRole: document.getElementById('discordRole').value,
                    webhookUrl: document.getElementById('webhookUrl').value,
                    serviceDescription: document.getElementById('serviceDescription').value
                };

                let success;
                if (this.currentEditId) {
                    success = await this.updateService(this.currentEditId, formData);
                } else {
                    success = await this.createService(formData);
                }

                if (success) {
                    this.closeServiceModal();
                    serviceForm.reset();
                    this.currentEditId = null;
                } else {
                    alert('Error saving service');
                }
            });
        }

        // Role Form
        const roleForm = document.getElementById('roleForm');
        if (roleForm) {
            roleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    name: document.getElementById('roleName').value
                };

                let success;
                if (this.currentEditId) {
                    success = await this.updateRole(this.currentEditId, formData);
                } else {
                    success = await this.createRole(formData);
                }

                if (success) {
                    this.closeRoleModal();
                    roleForm.reset();
                    this.currentEditId = null;
                } else {
                    alert('Error saving role');
                }
            });
        }

        // Staff Form
        const staffForm = document.getElementById('staffForm');
        if (staffForm) {
            staffForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    discord_id: document.getElementById('staffDiscordId').value,
                    username: document.getElementById('staffUsername').value,
                    role_id: document.getElementById('staffRole').value
                };

                let success;
                if (this.currentEditId) {
                    success = await this.updateStaff(this.currentEditId, formData);
                } else {
                    success = await this.createStaff(formData);
                }

                if (success) {
                    this.closeStaffModal();
                    staffForm.reset();
                    this.currentEditId = null;
                } else {
                    alert('Error saving staff member');
                }
            });
        }

        // Webhook Form
        const webhookForm = document.getElementById('webhookForm');
        if (webhookForm) {
            webhookForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    service: document.getElementById('webhookService').value,
                    url: document.getElementById('webhookUrlInput').value,
                    message_template: document.getElementById('webhookMessage').value
                };

                let success;
                if (this.currentEditId) {
                    success = await this.updateWebhook(this.currentEditId, formData);
                } else {
                    success = await this.createWebhook(formData);
                }

                if (success) {
                    this.closeWebhookModal();
                    webhookForm.reset();
                    this.currentEditId = null;
                } else {
                    alert('Error saving webhook');
                }
            });
        }
    }

    async updateService(serviceId, data) {
        try {
            const { error } = await this.supabase
                .from(TABLES.SERVICES)
                .update({
                    name: data.serviceName,
                    discord_role: data.discordRole,
                    webhook_url: data.webhookUrl,
                    description: data.serviceDescription
                })
                .eq('id', serviceId);

            if (error) throw error;
            await this.loadServices();
            return true;
        } catch (error) {
            console.error('Error updating service:', error);
            return false;
        }
    }

    async updateRole(roleId, data) {
        try {
            const permissions = [];
            const serviceAccess = [];

            document.querySelectorAll('#permissionsGroup input[type="checkbox"]:checked').forEach(cb => {
                permissions.push(cb.value);
            });

            document.querySelectorAll('#serviceAccessGroup input[type="checkbox"]:checked').forEach(cb => {
                serviceAccess.push(cb.value);
            });

            const { error } = await this.supabase
                .from(TABLES.ROLES)
                .update({
                    name: data.name,
                    permissions: permissions,
                    service_access: serviceAccess
                })
                .eq('id', roleId);

            if (error) throw error;
            await this.loadRoles();
            return true;
        } catch (error) {
            console.error('Error updating role:', error);
            return false;
        }
    }

    async updateStaff(staffId, data) {
        try {
            const { error } = await this.supabase
                .from(TABLES.STAFF)
                .update({
                    discord_id: data.discord_id,
                    username: data.username,
                    role_id: data.role_id
                })
                .eq('id', staffId);

            if (error) throw error;
            await this.loadStaff();
            return true;
        } catch (error) {
            console.error('Error updating staff:', error);
            return false;
        }
    }

    async createWebhook(data) {
        try {
            const { error } = await this.supabase
                .from(TABLES.WEBHOOKS)
                .insert([{
                    service: data.service,
                    url: data.url,
                    message_template: data.message_template,
                    status: 'active'
                }]);

            if (error) throw error;
            await this.loadWebhooks();
            return true;
        } catch (error) {
            console.error('Error creating webhook:', error);
            return false;
        }
    }

    async updateWebhook(webhookId, data) {
        try {
            const { error } = await this.supabase
                .from(TABLES.WEBHOOKS)
                .update({
                    service: data.service,
                    url: data.url,
                    message_template: data.message_template
                })
                .eq('id', webhookId);

            if (error) throw error;
            await this.loadWebhooks();
            return true;
        } catch (error) {
            console.error('Error updating webhook:', error);
            return false;
        }
    }

    async deleteWebhook(webhookId) {
        if (!confirm('Are you sure you want to delete this webhook?')) return;

        try {
            const { error } = await this.supabase
                .from(TABLES.WEBHOOKS)
                .delete()
                .eq('id', webhookId);

            if (error) throw error;
            await this.loadWebhooks();
        } catch (error) {
            console.error('Error deleting webhook:', error);
            alert('Error deleting webhook: ' + error.message);
        }
    }

    // Modal functions
    openServiceModal() {
        const modal = document.getElementById('serviceModal');
        if (modal) modal.style.display = 'block';
        this.populateServiceAccessCheckboxes();
    }

    closeServiceModal() {
        const modal = document.getElementById('serviceModal');
        if (modal) modal.style.display = 'none';
        this.currentEditId = null;
    }

    openRoleModal() {
        const modal = document.getElementById('roleModal');
        if (modal) modal.style.display = 'block';
        this.populateServiceAccessCheckboxes();
    }

    closeRoleModal() {
        const modal = document.getElementById('roleModal');
        if (modal) modal.style.display = 'none';
        this.currentEditId = null;
    }

    openStaffModal() {
        const modal = document.getElementById('staffModal');
        if (modal) modal.style.display = 'block';
    }

    closeStaffModal() {
        const modal = document.getElementById('staffModal');
        if (modal) modal.style.display = 'none';
        this.currentEditId = null;
    }

    openWebhookModal() {
        const modal = document.getElementById('webhookModal');
        if (modal) modal.style.display = 'block';
        
        // Populate service select
        const serviceSelect = document.getElementById('webhookService');
        if (serviceSelect) {
            serviceSelect.innerHTML = '<option value="">Select Service</option>';
            this.services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.name;
                option.textContent = service.name;
                serviceSelect.appendChild(option);
            });
        }
    }

    closeWebhookModal() {
        const modal = document.getElementById('webhookModal');
        if (modal) modal.style.display = 'none';
        this.currentEditId = null;
    }
}

// Global functions for modal control
function openServiceModal() {
    if (window.adminPanel) window.adminPanel.openServiceModal();
}

function closeServiceModal() {
    if (window.adminPanel) window.adminPanel.closeServiceModal();
}

function openRoleModal() {
    if (window.adminPanel) window.adminPanel.openRoleModal();
}

function closeRoleModal() {
    if (window.adminPanel) window.adminPanel.closeRoleModal();
}

function openStaffModal() {
    if (window.adminPanel) window.adminPanel.openStaffModal();
}

function closeStaffModal() {
    if (window.adminPanel) window.adminPanel.closeStaffModal();
}

function openWebhookModal() {
    if (window.adminPanel) window.adminPanel.openWebhookModal();
}

function closeWebhookModal() {
    if (window.adminPanel) window.adminPanel.closeWebhookModal();
}

function loadServices() {
    if (window.adminPanel) window.adminPanel.loadServices();
}

function loadRoles() {
    if (window.adminPanel) window.adminPanel.loadRoles();
}

function loadStaff() {
    if (window.adminPanel) window.adminPanel.loadStaff();
}

function loadWebhooks() {
    if (window.adminPanel) window.adminPanel.loadWebhooks();
}

function testWebhooks() {
    if (window.adminPanel) window.adminPanel.testWebhooks();
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (authManager && authManager.currentUser) {
            window.adminPanel = new AdminPanel();
        }
    }, 500);
});
