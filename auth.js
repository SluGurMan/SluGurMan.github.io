// Authentication Module
class AuthManager {
    constructor() {
        this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.currentUser = null;
        this.userPermissions = [];
        this.init();
    }

    async init() {
        // Check current session
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            await this.setCurrentUser(session.user);
        } else {
            this.redirectToLogin();
        }

        // Listen for auth changes
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                await this.setCurrentUser(session.user);
                window.location.reload();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.userPermissions = [];
                this.redirectToLogin();
            }
        });
    }

    async setCurrentUser(user) {
        this.currentUser = user;
        await this.loadUserPermissions();
        this.updateUI();
    }

    async loadUserPermissions() {
        if (!this.currentUser) return;

        try {
            // Check if user is admin
            const discordId = this.currentUser.user_metadata?.provider_id;
            if (discordId === ADMIN_DISCORD_ID) {
                this.userPermissions = Object.values(PERMISSIONS);
                return;
            }

            // Load user's role and permissions from database
            const { data: staffMember, error } = await this.supabase
                .from(TABLES.STAFF)
                .select(`
                    *,
                    roles:role_id (
                        *,
                        permissions
                    )
                `)
                .eq('discord_id', discordId)
                .eq('status', 'active')
                .single();

            if (error || !staffMember) {
                console.log('User not found in staff table or inactive');
                this.userPermissions = [];
                return;
            }

            this.userPermissions = staffMember.roles?.permissions || [];
        } catch (error) {
            console.error('Error loading user permissions:', error);
            this.userPermissions = [];
        }
    }

    hasPermission(permission) {
        return this.userPermissions.includes(permission) || 
               this.userPermissions.includes('admin_panel'); // Admin has all permissions
    }

    isAdmin() {
        return this.currentUser?.user_metadata?.provider_id === ADMIN_DISCORD_ID ||
               this.hasPermission(PERMISSIONS.ADMIN_PANEL);
    }

    updateUI() {
        const userInfo = document.getElementById('userInfo');
        if (userInfo && this.currentUser) {
            const username = this.currentUser.user_metadata?.full_name || 
                           this.currentUser.user_metadata?.name || 
                           'User';
            userInfo.textContent = `Welcome, ${username}`;
        }

        // Show/hide admin controls based on permissions
        const adminControls = document.getElementById('adminControls');
        if (adminControls) {
            adminControls.style.display = this.hasPermission(PERMISSIONS.VIEW_TICKETS) ? 'flex' : 'none';
        }
    }

    redirectToLogin() {
        if (window.location.pathname !== '/auth.html') {
            window.location.href = 'auth.html';
        }
    }

    async logout() {
        try {
            await this.supabase.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if logout fails
            window.location.href = 'auth.html';
        }
    }

    checkPageAccess(requiredPermission) {
        if (!this.currentUser) {
            this.redirectToLogin();
            return false;
        }

        if (requiredPermission && !this.hasPermission(requiredPermission)) {
            this.showAccessDenied();
            return false;
        }

        return true;
    }

    showAccessDenied() {
        const accessDenied = document.getElementById('accessDenied');
        const mainContent = document.getElementById('adminContent') || 
                          document.getElementById('ticketsContent');
        
        if (accessDenied) accessDenied.classList.remove('hidden');
        if (mainContent) mainContent.style.display = 'none';
    }
}

// Global auth instance
let authManager;

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});

// Global logout function
async function logout() {
    if (authManager) {
        await authManager.logout();
    }
}

// Utility functions for checking permissions
function hasPermission(permission) {
    return authManager ? authManager.hasPermission(permission) : false;
}

function isAdmin() {
    return authManager ? authManager.isAdmin() : false;
}

function getCurrentUser() {
    return authManager ? authManager.currentUser : null;
}

function checkPageAccess(requiredPermission) {
    return authManager ? authManager.checkPageAccess(requiredPermission) : false;
}
