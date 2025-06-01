-- Datenbank erstellen
CREATE DATABASE IF NOT EXISTS event_staff_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE event_staff_db;

-- Benutzer Tabelle
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    role ENUM('admin', 'staff', 'applicant') DEFAULT 'applicant',
    is_active BOOLEAN DEFAULT false,
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Personal Stammdaten
CREATE TABLE staff_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    street VARCHAR(255),
    house_number VARCHAR(20),
    postal_code VARCHAR(10),
    city VARCHAR(100),
    phone VARCHAR(20),
    tshirt_size ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'),
    profile_image VARCHAR(255),
    personal_code VARCHAR(10) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_personal_code (personal_code),
    INDEX idx_name (last_name, first_name)
);

-- Qualifikationen
CREATE TABLE qualifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007AFF',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mitarbeiter Qualifikationen
CREATE TABLE staff_qualifications (
    staff_id INT,
    qualification_id INT,
    obtained_date DATE DEFAULT (CURRENT_DATE),
    PRIMARY KEY (staff_id, qualification_id),
    FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (qualification_id) REFERENCES qualifications(id) ON DELETE CASCADE
);

-- Veranstaltungen
CREATE TABLE events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATETIME,
    end_date DATETIME,
    location VARCHAR(255),
    status ENUM('draft', 'published', 'completed', 'cancelled') DEFAULT 'draft',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date)
);

-- Schichten
CREATE TABLE shifts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT,
    name VARCHAR(100),
    start_time DATETIME,
    end_time DATETIME,
    required_staff INT DEFAULT 1,
    required_qualifications JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event_time (event_id, start_time)
);

-- Einladungen
CREATE TABLE event_invitations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT,
    staff_id INT,
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    notes TEXT,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_invitation (event_id, staff_id),
    INDEX idx_status (status)
);

-- Schicht Anmeldungen
CREATE TABLE shift_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    shift_id INT,
    staff_id INT,
    status ENUM('interested', 'assigned', 'confirmed', 'cancelled') DEFAULT 'interested',
    assignment_type ENUM('preliminary', 'final') DEFAULT 'preliminary',
    assigned_by INT,
    confirmed_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE KEY unique_registration (shift_id, staff_id),
    INDEX idx_status (status)
);

-- Stempel Positionen
CREATE TABLE stamp_positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007AFF',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stempeluhr
CREATE TABLE time_stamps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    staff_id INT,
    stamp_type ENUM('in', 'out'),
    position_id INT,
    stamp_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device_info VARCHAR(255),
    FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES stamp_positions(id),
    INDEX idx_staff_time (staff_id, stamp_time),
    INDEX idx_stamp_type (stamp_type)
);

-- Wissensdatenbank Kategorien
CREATE TABLE knowledge_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES knowledge_categories(id) ON DELETE CASCADE
);

-- Wissensdatenbank
CREATE TABLE knowledge_articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category_id INT,
    tags JSON,
    is_published BOOLEAN DEFAULT true,
    view_count INT DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES knowledge_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FULLTEXT(title, content)
);

-- Team Nachrichten
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT,
    content TEXT,
    event_id INT NULL,
    parent_id INT NULL,
    is_announcement BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES messages(id) ON DELETE CASCADE,
    INDEX idx_event (event_id),
    INDEX idx_created (created_at)
);

-- Email Templates
CREATE TABLE email_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    subject VARCHAR(255),
    body TEXT,
    variables JSON,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bewerbungen
CREATE TABLE applications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    street VARCHAR(255),
    house_number VARCHAR(20),
    postal_code VARCHAR(10),
    city VARCHAR(100),
    phone VARCHAR(20),
    tshirt_size ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'),
    profile_image VARCHAR(255),
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    notes TEXT,
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_email (email)
);

-- Audit Log
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user (user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
);

-- Standard Admin Benutzer (Passwort: admin123)
INSERT INTO users (email, password, role, is_active) 
VALUES ('admin@example.com', '$2a$10$8KJZ5kQKqDfJHZMJDyqVaODWBvLCLxqE9MFQXmP.rtFRJfnGnOFO6', 'admin', true);

-- Standard Qualifikationen
INSERT INTO qualifications (name, description, color) VALUES
('Barkeeper', 'Erfahrung im Ausschank von Getränken', '#FF9500'),
('Kassierer', 'Erfahrung im Umgang mit Kasse und Geld', '#4CD964'),
('Security', 'Ausbildung im Sicherheitsbereich', '#FF3B30'),
('Auf-/Abbau', 'Körperlich belastbar für Auf- und Abbauarbeiten', '#5856D6'),
('Einlass', 'Erfahrung in der Einlasskontrolle', '#007AFF'),
('Technik', 'Technisches Verständnis für Bühnentechnik', '#FF2D55');

-- Standard Stempel Positionen
INSERT INTO stamp_positions (name, description, color) VALUES
('Bar', 'Arbeit an der Bar/Getränkeausgabe', '#FF9500'),
('Kasse', 'Arbeit an der Kasse', '#4CD964'),
('Einlass', 'Einlasskontrolle', '#007AFF'),
('Security', 'Sicherheitsdienst', '#FF3B30'),
('Backstage', 'Backstage-Betreuung', '#5856D6'),
('Technik', 'Technische Betreuung', '#FF2D55'),
('Sonstiges', 'Andere Tätigkeiten', '#8E8E93');

-- Standard Email Templates
INSERT INTO email_templates (name, description, subject, body, variables) VALUES
(
    'application_accepted',
    'E-Mail bei Annahme einer Bewerbung',
    'Ihre Bewerbung wurde angenommen - {{company_name}}',
    'Sehr geehrte/r {{first_name}} {{last_name}},\n\nwir freuen uns Ihnen mitteilen zu können, dass Ihre Bewerbung erfolgreich war und Sie in unser Team aufgenommen wurden.\n\nBitte klicken Sie auf den folgenden Link, um Ihr Passwort festzulegen und Zugang zu unserem System zu erhalten:\n{{password_reset_link}}\n\nDer Link ist 48 Stunden gültig.\n\nWir freuen uns auf die Zusammenarbeit mit Ihnen!\n\nMit freundlichen Grüßen\n{{company_name}}',
    '["first_name", "last_name", "password_reset_link", "company_name"]'
),
(
    'application_rejected',
    'E-Mail bei Ablehnung einer Bewerbung',
    'Ihre Bewerbung bei {{company_name}}',
    'Sehr geehrte/r {{first_name}} {{last_name}},\n\nvielen Dank für Ihre Bewerbung und Ihr Interesse an einer Mitarbeit in unserem Team.\n\nLeider müssen wir Ihnen mitteilen, dass wir uns in diesem Fall für andere Bewerber entschieden haben.\n\nWir wünschen Ihnen für Ihre berufliche Zukunft alles Gute.\n\nMit freundlichen Grüßen\n{{company_name}}',
    '["first_name", "last_name", "company_name"]'
),
(
    'event_invitation',
    'Einladung zu einer Veranstaltung',
    'Einladung: {{event_name}} - {{event_date}}',
    'Hallo {{first_name}},\n\nwir laden dich herzlich ein, bei folgender Veranstaltung mitzuarbeiten:\n\n**{{event_name}}**\nDatum: {{event_date}}\nOrt: {{event_location}}\n\n{{event_description}}\n\nBitte melde dich in unserem System an, um die verfügbaren Schichten einzusehen und dich für diese anzumelden.\n\nWir freuen uns auf deine Rückmeldung!\n\nViele Grüße\n{{company_name}}',
    '["first_name", "event_name", "event_date", "event_location", "event_description", "company_name"]'
),
(
    'shift_assignment_preliminary',
    'Vorläufige Schichteinteilung',
    'Vorläufige Einteilung: {{event_name}}',
    'Hallo {{first_name}},\n\ndeine vorläufige Schichteinteilung für **{{event_name}}** ist jetzt verfügbar.\n\n{{shift_details}}\n\nBitte beachte: Diese Einteilung ist noch **vorläufig** und kann sich noch ändern. Die endgültige Einteilung erhältst du rechtzeitig vor der Veranstaltung.\n\nBei Fragen melde dich gerne bei uns.\n\nViele Grüße\n{{company_name}}',
    '["first_name", "event_name", "shift_details", "company_name"]'
),
(
    'shift_assignment_final',
    'Endgültige Schichteinteilung',
    'Endgültige Einteilung: {{event_name}} - Bitte bestätigen',
    'Hallo {{first_name}},\n\ndeine **endgültige** Schichteinteilung für **{{event_name}}** steht fest:\n\n{{shift_details}}\n\n**Wichtig:** Bitte bestätige deine Einteilung bis spätestens {{confirmation_deadline}} in unserem System.\n\nWir freuen uns auf die Zusammenarbeit!\n\nViele Grüße\n{{company_name}}',
    '["first_name", "event_name", "shift_details", "confirmation_deadline", "company_name"]'
),
(
    'password_reset',
    'Passwort zurücksetzen',
    'Passwort zurücksetzen - {{company_name}}',
    'Hallo {{first_name}},\n\ndu hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.\n\nKlicke auf folgenden Link, um ein neues Passwort festzulegen:\n{{reset_link}}\n\nDer Link ist 2 Stunden gültig.\n\nFalls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.\n\nViele Grüße\n{{company_name}}',
    '["first_name", "reset_link", "company_name"]'
);

-- Wissensdatenbank Kategorien
INSERT INTO knowledge_categories (name, description, sort_order) VALUES
('Allgemeine Informationen', 'Grundlegende Informationen für alle Mitarbeiter', 1),
('Veranstaltungsabläufe', 'Informationen zu typischen Veranstaltungsabläufen', 2),
('Sicherheit', 'Sicherheitsrelevante Informationen und Vorschriften', 3),
('Technik & Equipment', 'Anleitungen für technisches Equipment', 4),
('Notfallprozeduren', 'Verhalten in Notfällen', 5); -- Datenbank erstellen
CREATE DATABASE IF NOT EXISTS event_staff_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE event_staff_db;

-- Benutzer Tabelle
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    role ENUM('admin', 'staff', 'applicant') DEFAULT 'applicant',
    is_active BOOLEAN DEFAULT false,
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Personal Stammdaten
CREATE TABLE staff_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    street VARCHAR(255),
    house_number VARCHAR(20),
    postal_code VARCHAR(10),
    city VARCHAR(100),
    phone VARCHAR(20),
    tshirt_size ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'),
    profile_image VARCHAR(255),
    personal_code VARCHAR(10) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_personal_code (personal_code),
    INDEX idx_name (last_name, first_name)
);

-- Qualifikationen
CREATE TABLE qualifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007AFF',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mitarbeiter Qualifikationen
CREATE TABLE staff_qualifications (
    staff_id INT,
    qualification_id INT,
    obtained_date DATE DEFAULT (CURRENT_DATE),
    PRIMARY KEY (staff_id, qualification_id),
    FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (qualification_id) REFERENCES qualifications(id) ON DELETE CASCADE
);

-- Veranstaltungen
CREATE TABLE events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATETIME,
    end_date DATETIME,
    location VARCHAR(255),
    status ENUM('draft', 'published', 'completed', 'cancelled') DEFAULT 'draft',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date)
);

-- Schichten
CREATE TABLE shifts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT,
    name VARCHAR(100),
    start_time DATETIME,
    end_time DATETIME,
    required_staff INT DEFAULT 1,
    required_qualifications JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event_time (event_id, start_time)
);

-- Einladungen
CREATE TABLE event_invitations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT,
    staff_id INT,
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    notes TEXT,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_invitation (event_id, staff_id),
    INDEX idx_status (status)
);

-- Schicht Anmeldungen
CREATE TABLE shift_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    shift_id INT,
    staff_id INT,
    status ENUM('interested', 'assigned', 'confirmed', 'cancelled') DEFAULT 'interested',
    assignment_type ENUM('preliminary', 'final') DEFAULT 'preliminary',
    assigned_by INT,
    confirmed_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE KEY unique_registration (shift_id, staff_id),
    INDEX idx_status (status)
);

-- Stempel Positionen
CREATE TABLE stamp_positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007AFF',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stempeluhr
CREATE TABLE time_stamps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    staff_id INT,
    stamp_type ENUM('in', 'out'),
    position_id INT,
    stamp_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device_info VARCHAR(255),
    FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES stamp_positions(id),
    INDEX idx_staff_time (staff_id, stamp_time),
    INDEX idx_stamp_type (stamp_type)
);

-- Wissensdatenbank Kategorien
CREATE TABLE knowledge_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES knowledge_categories(id) ON DELETE CASCADE
);

-- Wissensdatenbank
CREATE TABLE knowledge_articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category_id INT,
    tags JSON,
    is_published BOOLEAN DEFAULT true,
    view_count INT DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES knowledge_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FULLTEXT(title, content)
);

-- Team Nachrichten
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT,
    content TEXT,
    event_id INT NULL,
    parent_id INT NULL,
    is_announcement BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES messages(id) ON DELETE CASCADE,
    INDEX idx_event (event_id),
    INDEX idx_created (created_at)
);

-- Email Templates
CREATE TABLE email_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    subject VARCHAR(255),
    body TEXT,
    variables JSON,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bewerbungen
CREATE TABLE applications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    street VARCHAR(255),
    house_number VARCHAR(20),
    postal_code VARCHAR(10),
    city VARCHAR(100),
    phone VARCHAR(20),
    tshirt_size ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'),
    profile_image VARCHAR(255),
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    notes TEXT,
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_email (email)
);

-- Audit Log
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user (user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
);

-- Standard Admin Benutzer (Passwort: admin123)
INSERT INTO users (email, password, role, is_active) 
VALUES ('admin@example.com', '$2a$10$8KJZ5kQKqDfJHZMJDyqVaODWBvLCLxqE9MFQXmP.rtFRJfnGnOFO6', 'admin', true);

-- Standard Qualifikationen
INSERT INTO qualifications (name, description, color) VALUES
('Barkeeper', 'Erfahrung im Ausschank von Getränken', '#FF9500'),
('Kassierer', 'Erfahrung im Umgang mit Kasse und Geld', '#4CD964'),
('Security', 'Ausbildung im Sicherheitsbereich', '#FF3B30'),
('Auf-/Abbau', 'Körperlich belastbar für Auf- und Abbauarbeiten', '#5856D6'),
('Einlass', 'Erfahrung in der Einlasskontrolle', '#007AFF'),
('Technik', 'Technisches Verständnis für Bühnentechnik', '#FF2D55');

-- Standard Stempel Positionen
INSERT INTO stamp_positions (name, description, color) VALUES
('Bar', 'Arbeit an der Bar/Getränkeausgabe', '#FF9500'),
('Kasse', 'Arbeit an der Kasse', '#4CD964'),
('Einlass', 'Einlasskontrolle', '#007AFF'),
('Security', 'Sicherheitsdienst', '#FF3B30'),
('Backstage', 'Backstage-Betreuung', '#5856D6'),
('Technik', 'Technische Betreuung', '#FF2D55'),
('Sonstiges', 'Andere Tätigkeiten', '#8E8E93');

-- Standard Email Templates
INSERT INTO email_templates (name, description, subject, body, variables) VALUES
(
    'application_accepted',
    'E-Mail bei Annahme einer Bewerbung',
    'Ihre Bewerbung wurde angenommen - {{company_name}}',
    'Sehr geehrte/r {{first_name}} {{last_name}},\n\nwir freuen uns Ihnen mitteilen zu können, dass Ihre Bewerbung erfolgreich war und Sie in unser Team aufgenommen wurden.\n\nBitte klicken Sie auf den folgenden Link, um Ihr Passwort festzulegen und Zugang zu unserem System zu erhalten:\n{{password_reset_link}}\n\nDer Link ist 48 Stunden gültig.\n\nWir freuen uns auf die Zusammenarbeit mit Ihnen!\n\nMit freundlichen Grüßen\n{{company_name}}',
    '["first_name", "last_name", "password_reset_link", "company_name"]'
),
(
    'application_rejected',
    'E-Mail bei Ablehnung einer Bewerbung',
    'Ihre Bewerbung bei {{company_name}}',
    'Sehr geehrte/r {{first_name}} {{last_name}},\n\nvielen Dank für Ihre Bewerbung und Ihr Interesse an einer Mitarbeit in unserem Team.\n\nLeider müssen wir Ihnen mitteilen, dass wir uns in diesem Fall für andere Bewerber entschieden haben.\n\nWir wünschen Ihnen für Ihre berufliche Zukunft alles Gute.\n\nMit freundlichen Grüßen\n{{company_name}}',
    '["first_name", "last_name", "company_name"]'
),
(
    'event_invitation',
    'Einladung zu einer Veranstaltung',
    'Einladung: {{event_name}} - {{event_date}}',
    'Hallo {{first_name}},\n\nwir laden dich herzlich ein, bei folgender Veranstaltung mitzuarbeiten:\n\n**{{event_name}}**\nDatum: {{event_date}}\nOrt: {{event_location}}\n\n{{event_description}}\n\nBitte melde dich in unserem System an, um die verfügbaren Schichten einzusehen und dich für diese anzumelden.\n\nWir freuen uns auf deine Rückmeldung!\n\nViele Grüße\n{{company_name}}',
    '["first_name", "event_name", "event_date", "event_location", "event_description", "company_name"]'
),
(
    'shift_assignment_preliminary',
    'Vorläufige Schichteinteilung',
    'Vorläufige Einteilung: {{event_name}}',
    'Hallo {{first_name}},\n\ndeine vorläufige Schichteinteilung für **{{event_name}}** ist jetzt verfügbar.\n\n{{shift_details}}\n\nBitte beachte: Diese Einteilung ist noch **vorläufig** und kann sich noch ändern. Die endgültige Einteilung erhältst du rechtzeitig vor der Veranstaltung.\n\nBei Fragen melde dich gerne bei uns.\n\nViele Grüße\n{{company_name}}',
    '["first_name", "event_name", "shift_details", "company_name"]'
),
(
    'shift_assignment_final',
    'Endgültige Schichteinteilung',
    'Endgültige Einteilung: {{event_name}} - Bitte bestätigen',
    'Hallo {{first_name}},\n\ndeine **endgültige** Schichteinteilung für **{{event_name}}** steht fest:\n\n{{shift_details}}\n\n**Wichtig:** Bitte bestätige deine Einteilung bis spätestens {{confirmation_deadline}} in unserem System.\n\nWir freuen uns auf die Zusammenarbeit!\n\nViele Grüße\n{{company_name}}',
    '["first_name", "event_name", "shift_details", "confirmation_deadline", "company_name"]'
),
(
    'password_reset',
    'Passwort zurücksetzen',
    'Passwort zurücksetzen - {{company_name}}',
    'Hallo {{first_name}},\n\ndu hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.\n\nKlicke auf folgenden Link, um ein neues Passwort festzulegen:\n{{reset_link}}\n\nDer Link ist 2 Stunden gültig.\n\nFalls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.\n\nViele Grüße\n{{company_name}}',
    '["first_name", "reset_link", "company_name"]'
);

-- Wissensdatenbank Kategorien
INSERT INTO knowledge_categories (name, description, sort_order) VALUES
('Allgemeine Informationen', 'Grundlegende Informationen für alle Mitarbeiter', 1),
('Veranstaltungsabläufe', 'Informationen zu typischen Veranstaltungsabläufen', 2),
('Sicherheit', 'Sicherheitsrelevante Informationen und Vorschriften', 3),
('Technik & Equipment', 'Anleitungen für technisches Equipment', 4),
('Notfallprozeduren', 'Verhalten in Notfällen', 5);
