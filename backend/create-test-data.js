// backend/create-test-data.js
const db = require('./src/config/database');
const { addDays, addHours, subDays } = require('date-fns');

async function createTestData() {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('=== Creating Test Data for Staff Dashboard ===');
    console.log('');
    
    // Get staff user
    const [staffUsers] = await connection.execute(
      `SELECT u.id as user_id, sp.id as staff_id, sp.personal_code 
       FROM users u 
       JOIN staff_profiles sp ON u.id = sp.user_id 
       WHERE u.email = 'staff@test.com'`
    );
    
    if (staffUsers.length === 0) {
      console.log('❌ Staff user not found! Run create-test-staff.js first.');
      process.exit(1);
    }
    
    const { user_id, staff_id, personal_code } = staffUsers[0];
    console.log('Found staff user:', { user_id, staff_id, personal_code });
    
    // Get admin user
    const [adminUsers] = await connection.execute(
      'SELECT id FROM users WHERE email = "admin@test.com"'
    );
    
    const adminId = adminUsers[0]?.id || 1;
    
    // 1. Create test events
    console.log('\n1. Creating events...');
    
    const events = [
      {
        name: 'Sommerfest 2025',
        location: 'Stadtpark Berlin',
        start: addDays(new Date(), 2),
        end: addDays(addHours(new Date(), 8), 2),
        status: 'published'
      },
      {
        name: 'Konzert im Park',
        location: 'Waldbühne Berlin',
        start: addDays(new Date(), 7),
        end: addDays(addHours(new Date(), 6), 7),
        status: 'published'
      },
      {
        name: 'Weihnachtsmarkt',
        location: 'Alexanderplatz',
        start: addDays(new Date(), 14),
        end: addDays(addHours(new Date(), 10), 14),
        status: 'published'
      }
    ];
    
    const eventIds = [];
    for (const event of events) {
      const [result] = await connection.execute(
        `INSERT INTO events (name, location, start_date, end_date, status, created_by, max_staff) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [event.name, event.location, event.start, event.end, event.status, adminId, 20]
      );
      eventIds.push(result.insertId);
      console.log(`✓ Created event: ${event.name}`);
    }
    
    // 2. Create positions if not exist
    console.log('\n2. Checking positions...');
    const [positions] = await connection.execute('SELECT id, name FROM positions LIMIT 5');
    if (positions.length === 0) {
      await connection.execute(
        `INSERT INTO positions (name, color) VALUES 
         ('Service', '#007AFF'),
         ('Bar', '#FF9500'),
         ('Kasse', '#34C759'),
         ('Security', '#FF3B30'),
         ('Einlass', '#5856D6')`
      );
      console.log('✓ Created default positions');
    }
    
    // 3. Create event invitations
    console.log('\n3. Creating event invitations...');
    
    // Pending invitation for first event
    await connection.execute(
      'INSERT INTO event_invitations (event_id, staff_id, status) VALUES (?, ?, ?)',
      [eventIds[0], staff_id, 'pending']
    );
    console.log('✓ Created pending invitation');
    
    // Accepted invitation for second event
    await connection.execute(
      'INSERT INTO event_invitations (event_id, staff_id, status, responded_at) VALUES (?, ?, ?, NOW())',
      [eventIds[1], staff_id, 'accepted']
    );
    console.log('✓ Created accepted invitation');
    
    // 4. Create shifts
    console.log('\n4. Creating shifts...');
    const shiftIds = [];
    
    for (let i = 0; i < eventIds.length; i++) {
      const shifts = [
        { name: 'Frühschicht', start: 0, duration: 6 },
        { name: 'Spätschicht', start: 6, duration: 6 }
      ];
      
      for (const shift of shifts) {
        const startTime = addHours(events[i].start, shift.start);
        const endTime = addHours(startTime, shift.duration);
        
        const [result] = await connection.execute(
          `INSERT INTO shifts (event_id, name, start_time, end_time, required_staff, position_id) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [eventIds[i], shift.name, startTime, endTime, 5, positions[0].id]
        );
        shiftIds.push(result.insertId);
      }
    }
    console.log(`✓ Created ${shiftIds.length} shifts`);
    
    // 5. Create shift assignments
    console.log('\n5. Creating shift assignments...');
    
    // Confirmed shift for tomorrow
    await connection.execute(
      `INSERT INTO shift_assignments (shift_id, staff_id, status, assigned_by, position_id, confirmed_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [shiftIds[0], staff_id, 'confirmed', adminId, positions[0].id]
    );
    console.log('✓ Created confirmed shift assignment');
    
    // Final shift (needs confirmation)
    await connection.execute(
      `INSERT INTO shift_assignments (shift_id, staff_id, status, assigned_by, position_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [shiftIds[2], staff_id, 'final', adminId, positions[1].id]
    );
    console.log('✓ Created final shift assignment');
    
    // Preliminary shift
    await connection.execute(
      `INSERT INTO shift_assignments (shift_id, staff_id, status, assigned_by, position_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [shiftIds[3], staff_id, 'preliminary', adminId, positions[0].id]
    );
    console.log('✓ Created preliminary shift assignment');
    
    // 6. Create messages
    console.log('\n6. Creating messages...');
    
    const messages = [
      {
        subject: 'Willkommen im Team!',
        content: 'Hallo Max,\n\nHerzlich willkommen in unserem Event-Team! Wir freuen uns, dass du dabei bist.\n\nBei Fragen kannst du dich jederzeit melden.\n\nViele Grüße\nDas Management',
        priority: 'normal'
      },
      {
        subject: 'Wichtig: Schichtänderung Sommerfest',
        content: 'Hallo,\n\nbitte beachte, dass sich die Anfangszeit für das Sommerfest um 30 Minuten nach vorne verschoben hat.\n\nBitte sei pünktlich!\n\nVG',
        priority: 'high'
      },
      {
        subject: 'Neue Veranstaltung verfügbar',
        content: 'Es gibt eine neue Veranstaltung, für die du dich bewerben kannst. Schau mal in deine Einladungen!',
        priority: 'normal'
      }
    ];
    
    for (const msg of messages) {
      const [msgResult] = await connection.execute(
        'INSERT INTO messages (sender_id, subject, content, priority, is_global) VALUES (?, ?, ?, ?, ?)',
        [adminId, msg.subject, msg.content, msg.priority, 0]
      );
      
      // Create recipient entry (mark first as read)
      await connection.execute(
        'INSERT INTO message_recipients (message_id, recipient_id, is_read, read_at) VALUES (?, ?, ?, ?)',
        [msgResult.insertId, user_id, messages.indexOf(msg) === 0 ? 1 : 0, messages.indexOf(msg) === 0 ? new Date() : null]
      );
    }
    console.log(`✓ Created ${messages.length} messages (2 unread)`);
    
    // 7. Create timeclock entries
    console.log('\n7. Creating timeclock entries...');
    
    // Past entries
    for (let i = 1; i <= 5; i++) {
      const clockIn = subDays(new Date(), i);
      clockIn.setHours(8, 0, 0);
      const clockOut = new Date(clockIn);
      clockOut.setHours(16, 30, 0);
      
      await connection.execute(
        `INSERT INTO timeclock_entries (staff_id, position_id, clock_in, clock_out, break_minutes, total_minutes, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [staff_id, positions[0].id, clockIn, clockOut, 30, 480, 'completed']
      );
    }
    console.log('✓ Created 5 past timeclock entries');
    
    // Current active entry (clocked in)
    const now = new Date();
    now.setHours(9, 0, 0);
    await connection.execute(
      `INSERT INTO timeclock_entries (staff_id, position_id, clock_in, status, event_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [staff_id, positions[0].id, now, 'active', eventIds[0]]
    );
    console.log('✓ Created active timeclock entry');
    
    // 8. Add some qualifications
    console.log('\n8. Adding qualifications...');
    const [quals] = await connection.execute('SELECT id FROM qualifications LIMIT 3');
    for (const qual of quals) {
      await connection.execute(
        'INSERT IGNORE INTO staff_qualifications (staff_id, qualification_id, assigned_by) VALUES (?, ?, ?)',
        [staff_id, qual.id, adminId]
      );
    }
    console.log('✓ Added qualifications');
    
    await connection.commit();
    
    console.log('\n✅ Test data created successfully!');
    console.log('\nDashboard should now show:');
    console.log('- 3 upcoming shifts');
    console.log('- 1 pending invitation');
    console.log('- 2 unread messages');
    console.log('- ~40 hours worked this month');
    console.log('- 1 active clock-in');
    
  } catch (error) {
    await connection.rollback();
    console.error('Error creating test data:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

// Wait for DB connection
setTimeout(createTestData, 500);
