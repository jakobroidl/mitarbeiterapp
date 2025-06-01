// TEMPORÄRE MOCK-VERSION - Ersetzen Sie diese Datei später mit der echten Version!

console.log('⚠️  MOCK-DATENBANK AKTIV - Keine echte Datenbankverbindung!');

// Mock Datenbank Pool
const pool = {
  execute: async (query, params = []) => {
    console.log('Mock Query:', query.substring(0, 60) + '...');
    
    // Mock Admin-Login
    if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE u.email')) {
      if (params[0] === 'admin@example.com') {
        return [[{
          id: 1,
          email: 'admin@example.com',
          password: '$2a$10$8KJZ5kQKqDfJHZMJDyqVaODWBvLCLxqE9MFQXmP.rtFRJfnGnOFO6', // admin123
          role: 'admin',
          is_active: 1,
          first_name: 'Admin',
          last_name: 'User',
          profile_image: null,
          personal_code: '20240001'
        }]];
      }
    }
    
    // Mock für getMe
    if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE u.id')) {
      if (params[0] === 1) {
        return [[{
          id: 1,
          email: 'admin@example.com',
          role: 'admin',
          is_active: 1,
          first_name: 'Admin',
          last_name: 'User',
          birth_date: '1990-01-01',
          street: 'Musterstraße',
          house_number: '1',
          postal_code: '12345',
          city: 'Musterstadt',
          phone: '+49 123 456789',
          tshirt_size: 'L',
          profile_image: null,
          personal_code: '20240001'
        }]];
      }
    }
    
    // Mock für Qualifikationen
    if (query.includes('qualifications') && query.includes('WHERE is_active')) {
      return [[
        { id: 1, name: 'Barkeeper', description: 'Erfahrung im Ausschank', color: '#FF9500' },
        { id: 2, name: 'Kassierer', description: 'Kassenerfahrung', color: '#4CD964' },
        { id: 3, name: 'Security', description: 'Sicherheitsdienst', color: '#FF3B30' }
      ]];
    }
    
    // Mock für Dashboard Stats
    if (query.includes('COUNT(*)')) {
      return [[{ count: 5 }]];
    }
    
    // Mock für Dashboard Overview
    if (query.includes('applications') && query.includes('WHERE status')) {
      return [[
        {
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'Bewerber',
          status: 'pending',
          created_at: new Date()
        }
      ]];
    }
    
    // Mock für INSERT/UPDATE/DELETE
    if (query.includes('INSERT') || query.includes('UPDATE') || query.includes('DELETE')) {
      return [{ insertId: 1, affectedRows: 1 }];
    }
    
    // Default: Leeres Array
    return [[]];
  },
  
  getConnection: async () => {
    return {
      execute: pool.execute,
      beginTransaction: async () => console.log('Mock: Transaction started'),
      commit: async () => console.log('Mock: Transaction committed'),
      rollback: async () => console.log('Mock: Transaction rolled back'),
      release: () => console.log('Mock: Connection released'),
      query: async (query, params) => {
        console.log('Mock Query:', query);
        return [[]];
      }
    };
  }
};

// Keine echte Verbindung, aber kein Fehler
setTimeout(() => {
  console.log('✅ Mock-Datenbank bereit für Tests');
}, 100);

module.exports = pool;
