export type Role = 'admin' | 'editor' | 'support' | 'analyst' | 'user' | 'reseller';

export const ROLES: Record<Role, string[]> = {
    admin: ['*'],
    editor: [
        'read:products', 'write:products',
        'read:inventory', 'write:inventory',
        'read:vouchers', 'write:vouchers',
        'read:orders', // Editors might need to see orders but not manage them
    ],
    support: [
        'read:orders', 'write:orders',
        'read:users', 'write:users',
        'read:chat', 'write:chat',
        'read:products', // Support needs to see products
    ],
    analyst: [
        'read:analytics',
        'read:reports',
        'read:orders', // Analysts need data
        'read:products',
        'read:users',
    ],
    user: [],
    reseller: ['read:reseller_dashboard']
};

export const hasPermission = (userRole: string, requiredPermission: string): boolean => {
    const role = userRole as Role;
    const permissions = ROLES[role] || [];

    if (permissions.includes('*')) return true;
    return permissions.includes(requiredPermission);
};
