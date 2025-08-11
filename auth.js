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
               this.userPermissions.includes(PERMISSIONS.ADMIN_PANEL); // Admin has all permissions
    }

    isAdmin() {
        return this.currentUser?.user_metadata?.provider_id === ADMIN_DISCORD_ID ||
               this.hasPermission(PERMISSIONS.ADMIN_PANEL);
    }

    updateUI() {
        const userInfo = document.getElementById('userInfo');
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const adminControls = document.getElementById('adminControls');

        if (this.currentUser) {
            const username = this.currentUser.user_metadata?.full_name ||
                             this.currentUser.user_metadata?.name ||
                             'User';
            if (userInfo) userInfo.textContent = `Welcome, ${username}`;

            if (loginBtn) loginBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');

            if (adminControls) {
                adminControls.style.display = this.hasPermission(PERMISSIONS.VIEW_TICKETS) ? 'flex' : 'none';
            }
        } else {
            if (userInfo) userInfo.textContent = '';
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (adminControls) adminControls.style.display = 'none';
        }
    }

    redirectToLogin() {
        const currentPath = window.location.pathname.split('/').pop();
        if (currentPath !== 'auth.html') {
            window.location.href = 'auth.html';
        }
    }

    async logout() {
        try {
            await this.supabase.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
        window.location.href = 'auth.html';
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

    // Hook up login button if on index.html
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            await authManager.supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: { redirectTo: `${window.location.origin}/index.html` }
            });
        });
    }

    // Hook up logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => authManager.logout());
    }
});

// Utility functions
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
