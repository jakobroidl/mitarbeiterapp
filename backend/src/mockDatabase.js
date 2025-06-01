// Mock-Datenbank - Später durch SQL ersetzen
class MockDatabase {
  constructor() {
    // Verwende globale Variable um Daten zwischen Requires zu behalten
    if (!global.mockDbData) {
      global.mockDbData = {
        applications: [],
        users: [
          {
            id: '1',
            email: 'admin@example.com',
            password: 'admin123',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            createdAt: new Date()
          }
        ],
        events: [],
        qualifications: [
          { id: 1, name: 'Barkeeper', description: 'Erfahrung im Ausschank', color: '#FF9500', is_active: true },
          { id: 2, name: 'Kassierer', description: 'Kassenerfahrung', color: '#4CD964', is_active: true },
          { id: 3, name: 'Security', description: 'Sicherheitsdienst', color: '#FF3B30', is_active: true }
        ]
      };
    }
    
    // Referenz auf globale Daten
    this.applications = global.mockDbData.applications;
    this.users = global.mockDbData.users;
    this.events = global.mockDbData.events;
    this.qualifications = global.mockDbData.qualifications;
  }

  // Applications
  async createApplication(data) {
    const application = {
      id: Date.now().toString(),
      ...data,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.applications.push(application);
    global.mockDbData.applications = this.applications; // Update global
    
    console.log('✅ Bewerbung gespeichert:', application.email);
    console.log('📊 Anzahl Bewerbungen:', this.applications.length);
    
    return application;
  }

  async getApplications(filter = {}) {
    let results = [...this.applications];
    
    console.log('📋 Abrufen von Bewerbungen. Total:', results.length);
    
    if (filter.status) {
      results = results.filter(app => app.status === filter.status);
    }
    
    return results.sort((a, b) => {
      const dateA = new Date(b.created_at || b.createdAt);
      const dateB = new Date(a.created_at || a.createdAt);
      return dateA - dateB;
    });
  }

  async getApplicationById(id) {
    return this.applications.find(app => app.id === id);
  }

  async updateApplication(id, updates) {
    const index = this.applications.findIndex(app => app.id === id);
    if (index === -1) return null;
    
    this.applications[index] = {
      ...this.applications[index],
      ...updates,
      updated_at: new Date()
    };
    
    global.mockDbData.applications = this.applications; // Update global
    return this.applications[index];
  }

  // Users
  async createUser(data) {
    const user = {
      id: Date.now().toString(),
      ...data,
      role: 'staff',
      createdAt: new Date()
    };
    
    this.users.push(user);
    global.mockDbData.users = this.users; // Update global
    return user;
  }

  async getUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  async getUserById(id) {
    return this.users.find(user => user.id === id);
  }

  // Hilfsfunktion zum Zurücksetzen (für Tests)
  async reset() {
    global.mockDbData = undefined;
    console.log('🔄 Mock-Datenbank zurückgesetzt');
  }
}

// Singleton Instance
const mockDB = new MockDatabase();

module.exports = mockDB;
