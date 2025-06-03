-- Event Staff Management Database Schema
-- Komplettes Schema für alle Funktionen

-- Datenbank erstellen
CREATE DATABASE IF NOT EXISTS event_staff_db;
USE event_staff_db;

-- 1. Users Tabelle (Basis für Authentication)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff', 'applicant') DEFAULT 'applicant',
  is_active BOOLEAN DEFAULT 1,
  reset_token VARCHAR(255),
  reset_token_expires DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_reset_token (reset_token)
);

-- 2. Staff Profiles (Personalstamm)
CREATE TABLE IF NOT EXISTS staff_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  personal_code VARCHAR(20) UNIQUE NOT NULL, -- Für Stempeluhr
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  phone VARCHAR(50) NOT NULL,
  street VARCHAR(255) NOT NULL,
  house_number VARCHAR(20) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  city VARCHAR(100) NOT NULL,
  tshirt_size ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL') NOT NULL,
  profile_image VARCHAR(255),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(50),
  notes TEXT,
  hired_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_personal_code (personal_code),
  INDEX idx_name (last_name, first_name)
);

-- 3. Applications (Bewerbungen)
CREATE TABLE IF NOT EXISTS applications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  phone VARCHAR(50) NOT NULL,
  street VARCHAR(255) NOT NULL,
  house_number VARCHAR(20) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  city VARCHAR(100) NOT NULL,
  tshirt_size ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL') NOT NULL,
  profile_image VARCHAR(255),
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  rejection_reason TEXT,
  processed_by INT,
  processed_at DATETIME,
  privacy_agreed BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_email (email)
);

-- 4. Qualifications (Qualifikationen)
CREATE TABLE IF NOT EXISTS qualifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#007AFF', -- Hex color for UI
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_name (name)
);

-- 5. Staff Qualifications (Mitarbeiter-Qualifikationen Zuordnung)
CREATE TABLE IF NOT EXISTS staff_qualifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  qualification_id INT NOT NULL,
  assigned_by INT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (qualification_id) REFERENCES qualifications(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_staff_qualification (staff_id, qualification_id)
);

-- 6. Positions (Positionen für Stempeluhr)
CREATE TABLE IF NOT EXISTS positions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#007AFF',
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_name (name)
);

-- 7. Events (Veranstaltungen)
CREATE TABLE IF NOT EXISTS events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255) NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  status ENUM('draft', 'published', 'cancelled', 'completed') DEFAULT 'draft',
  created_by INT NOT NULL,
  max_staff INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_dates (start_date, end_date),
  INDEX idx_status (status)
);

-- 8. Event Invitations (Einladungen zu Veranstaltungen)
CREATE TABLE IF NOT EXISTS event_invitations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  staff_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_invitation (event_id, staff_id),
  INDEX idx_status (status)
);

-- 9. Shifts (Schichten)
CREATE TABLE IF NOT EXISTS shifts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  required_staff INT DEFAULT 1,
  position_id INT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  INDEX idx_event (event_id),
  INDEX idx_times (start_time, end_time)
);

-- 10. Shift Applications (Bewerbungen für Schichten)
CREATE TABLE IF NOT EXISTS shift_applications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shift_id INT NOT NULL,
  staff_id INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_application (shift_id, staff_id),
  INDEX idx_status (status)
);

-- 11. Shift Assignments (Schichteinteilungen)
CREATE TABLE IF NOT EXISTS shift_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shift_id INT NOT NULL,
  staff_id INT NOT NULL,
  status ENUM('preliminary', 'final', 'confirmed') DEFAULT 'preliminary',
  assigned_by INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME,
  position_id INT,
  notes TEXT,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  UNIQUE KEY unique_assignment (shift_id, staff_id),
  INDEX idx_status (status),
  INDEX idx_staff (staff_id)
);

-- 12. Timeclock Entries (Stempeluhr-Einträge)
CREATE TABLE IF NOT EXISTS timeclock_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  event_id INT,
  shift_id INT,
  position_id INT NOT NULL,
  clock_in DATETIME NOT NULL,
  clock_out DATETIME,
  break_minutes INT DEFAULT 0,
  total_minutes INT,
  status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE RESTRICT,
  INDEX idx_staff_date (staff_id, clock_in),
  INDEX idx_status (status),
  INDEX idx_event (event_id)
);

-- 13. Messages (Nachrichten)
CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
  is_global BOOLEAN DEFAULT 0, -- An alle Mitarbeiter
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_created (created_at),
  INDEX idx_global (is_global)
);

-- 14. Message Recipients (Nachrichtenempfänger)
CREATE TABLE IF NOT EXISTS message_recipients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,
  recipient_id INT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  read_at DATETIME,
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at DATETIME,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_recipient (message_id, recipient_id),
  INDEX idx_recipient_read (recipient_id, is_read),
  INDEX idx_recipient_deleted (recipient_id, is_deleted)
);

-- 15. Email Templates (E-Mail Vorlagen)
CREATE TABLE IF NOT EXISTS email_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT NOT NULL,
  variables TEXT, -- JSON array of available variables
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_name (name)
);

-- 16. Activity Log (Aktivitätsprotokoll)
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created (created_at)
);

-- 17. Settings (App-Einstellungen)
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Beispiel-Daten für initiale Einrichtung

-- Admin User
INSERT INTO users (email, password, role, is_active) VALUES 
('admin@example.com', '$2a$10$YourHashedPasswordHere', 'admin', 1);

-- Standard Qualifikationen
INSERT INTO qualifications (name, description, color) VALUES 
('Barkeeper', 'Erfahrung im Ausschank von Getränken', '#FF9500'),
('Kassierer', 'Kassenerfahrung und Abrechnungen', '#34C759'),
('Security', 'Sicherheitspersonal mit Qualifikation', '#FF3B30'),
('Auf-/Abbau', 'Hilfe beim Auf- und Abbau', '#007AFF'),
('Garderobe', 'Garderobenbetreuung', '#AF52DE'),
('Einlass', 'Einlasskontrolle und Ticketprüfung', '#5856D6');

-- Standard Positionen
INSERT INTO positions (name, description, color) VALUES 
('Bar', 'Barservice und Getränkeausgabe', '#FF9500'),
('Kasse', 'Kassenbereich', '#34C759'),
('Security', 'Sicherheitsdienst', '#FF3B30'),
('Helfer', 'Allgemeine Unterstützung', '#007AFF'),
('Einlass', 'Eingangsbereich', '#5856D6');

-- Standard E-Mail Templates
INSERT INTO email_templates (name, subject, body_text, body_html, variables) VALUES 
('application_accepted', 
 'Ihre Bewerbung wurde angenommen', 
 'Hallo {{firstName}} {{lastName}},\n\nIhre Bewerbung wurde angenommen. Bitte setzen Sie Ihr Passwort über folgenden Link: {{resetLink}}\n\nMit freundlichen Grüßen\nDas Event Staff Team',
 '<p>Hallo {{firstName}} {{lastName}},</p><p>Ihre Bewerbung wurde angenommen. Bitte setzen Sie Ihr Passwort über folgenden Link:</p><p><a href="{{resetLink}}">Passwort festlegen</a></p><p>Mit freundlichen Grüßen<br>Das Event Staff Team</p>',
 '["firstName", "lastName", "resetLink"]'),

('application_rejected',
 'Ihre Bewerbung', 
 'Hallo {{firstName}} {{lastName}},\n\nleider müssen wir Ihnen mitteilen, dass wir Ihre Bewerbung nicht berücksichtigen können.\n\nMit freundlichen Grüßen\nDas Event Staff Team',
 '<p>Hallo {{firstName}} {{lastName}},</p><p>leider müssen wir Ihnen mitteilen, dass wir Ihre Bewerbung nicht berücksichtigen können.</p><p>Mit freundlichen Grüßen<br>Das Event Staff Team</p>',
 '["firstName", "lastName"]'),

('event_invitation',
 'Einladung: {{eventName}}',
 'Hallo {{firstName}},\n\nSie sind eingeladen bei folgender Veranstaltung mitzuarbeiten:\n\n{{eventName}}\nDatum: {{eventDate}}\nOrt: {{eventLocation}}\n\nBitte melden Sie sich in der App an um die Einladung anzunehmen.\n\nMit freundlichen Grüßen\nDas Event Staff Team',
 '<p>Hallo {{firstName}},</p><p>Sie sind eingeladen bei folgender Veranstaltung mitzuarbeiten:</p><p><strong>{{eventName}}</strong><br>Datum: {{eventDate}}<br>Ort: {{eventLocation}}</p><p>Bitte melden Sie sich in der App an um die Einladung anzunehmen.</p><p>Mit freundlichen Grüßen<br>Das Event Staff Team</p>',
 '["firstName", "eventName", "eventDate", "eventLocation"]'),

('shift_assignment',
 'Schichteinteilung: {{eventName}}',
 'Hallo {{firstName}},\n\nIhre Schichteinteilung für {{eventName}} wurde {{status}}.\n\nBitte prüfen Sie die Details in der App.\n\nMit freundlichen Grüßen\nDas Event Staff Team',
 '<p>Hallo {{firstName}},</p><p>Ihre Schichteinteilung für <strong>{{eventName}}</strong> wurde {{status}}.</p><p>Bitte prüfen Sie die Details in der App.</p><p>Mit freundlichen Grüßen<br>Das Event Staff Team</p>',
 '["firstName", "eventName", "status"]'),

('new_message',
 'Neue Nachricht in der Event Staff App',
 'Hallo {{firstName}},\n\nSie haben eine neue Nachricht erhalten:\n\nBetreff: {{subject}}\n\nBitte melden Sie sich in der App an um die Nachricht zu lesen.\n\nMit freundlichen Grüßen\nDas Event Staff Team',
 '<p>Hallo {{firstName}},</p><p>Sie haben eine neue Nachricht erhalten:</p><p><strong>Betreff:</strong> {{subject}}</p><p>Bitte melden Sie sich in der App an um die Nachricht zu lesen.</p><p>Mit freundlichen Grüßen<br>Das Event Staff Team</p>',
 '["firstName", "subject"]');

-- Einstellungen
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES 
('kiosk_token', 'change-this-secure-token', 'string', 'Sicherheitstoken für Kiosk-Modus'),
('auto_break_minutes', '30', 'number', 'Automatische Pause nach X Minuten'),
('max_shift_hours', '12', 'number', 'Maximale Schichtlänge in Stunden'),
('company_name', 'Event Staff GmbH', 'string', 'Firmenname'),
('default_timezone', 'Europe/Berlin', 'string', 'Standard Zeitzone');

-- Views für häufige Abfragen

-- Aktive Mitarbeiter mit User-Daten
CREATE VIEW v_active_staff AS
SELECT 
  s.id,
  s.personal_code,
  s.first_name,
  s.last_name,
  CONCAT(s.first_name, ' ', s.last_name) as full_name,
  u.email,
  u.role,
  s.phone,
  s.profile_image,
  s.hired_date
FROM staff_profiles s
JOIN users u ON s.user_id = u.id
WHERE u.is_active = 1 AND u.role IN ('staff', 'admin');

-- Übersicht offene Bewerbungen
CREATE VIEW v_pending_applications AS
SELECT 
  id,
  CONCAT(first_name, ' ', last_name) as full_name,
  email,
  phone,
  created_at,
  DATEDIFF(NOW(), created_at) as days_pending
FROM applications
WHERE status = 'pending'
ORDER BY created_at ASC;

-- Aktuelle Schichteinteilungen
CREATE VIEW v_current_shift_assignments AS
SELECT 
  sa.id,
  sa.status,
  sa.confirmed_at,
  sh.name as shift_name,
  sh.start_time,
  sh.end_time,
  e.name as event_name,
  e.location as event_location,
  s.personal_code,
  CONCAT(s.first_name, ' ', s.last_name) as staff_name,
  p.name as position_name
FROM shift_assignments sa
JOIN shifts sh ON sa.shift_id = sh.id
JOIN events e ON sh.event_id = e.id
JOIN staff_profiles s ON sa.staff_id = s.id
LEFT JOIN positions p ON sa.position_id = p.id
WHERE e.status = 'published' 
  AND e.end_date >= NOW()
ORDER BY sh.start_time;



