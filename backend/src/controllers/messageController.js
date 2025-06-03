// backend/src/controllers/messageController.js
const db = require('../config/database');
const { validationResult } = require('express-validator');
const { sendNewMessageNotification, sendBulkEmail } = require('../services/emailService');

// Alle Nachrichten abrufen (Posteingang)
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { folder = 'inbox', unread, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        m.id,
        m.subject,
        m.content,
        m.priority,
        m.created_at,
        mr.is_read,
        mr.read_at,
        u.email as sender_email,
        CONCAT(COALESCE(sp.first_name, 'System'), ' ', COALESCE(sp.last_name, '')) as sender_name,
        sp.profile_image as sender_image
      FROM message_recipients mr
      JOIN messages m ON mr.message_id = m.id
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE mr.recipient_id = ? AND mr.is_deleted = 0
    `;
    
    const params = [userId];
    
    // Filter für ungelesene Nachrichten
    if (unread === 'true') {
      query += ' AND mr.is_read = 0';
    }
    
    // Sortierung
    query += ' ORDER BY m.created_at DESC';
    
    // Count total
    const countQuery = query.replace(/SELECT[\s\S]*FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;
    
    // Pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [messages] = await db.execute(query, params);
    
    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Nachrichten:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Nachrichten' 
    });
  }
};

// Einzelne Nachricht abrufen
const getMessage = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const userId = req.user.id;
    
    // Hole Nachricht
    const [messages] = await connection.execute(`
      SELECT 
        m.*,
        mr.is_read,
        mr.read_at,
        u.email as sender_email,
        CONCAT(COALESCE(sp.first_name, 'System'), ' ', COALESCE(sp.last_name, '')) as sender_name,
        sp.profile_image as sender_image
      FROM messages m
      LEFT JOIN message_recipients mr ON m.id = mr.message_id AND mr.recipient_id = ?
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE m.id = ? AND (mr.recipient_id = ? OR m.sender_id = ?)
    `, [userId, id, userId, userId]);
    
    if (messages.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'Nachricht nicht gefunden' 
      });
    }
    
    const message = messages[0];
    
    // Markiere als gelesen wenn Empfänger
    if (!message.is_read && message.sender_id !== userId) {
      await connection.execute(
        'UPDATE message_recipients SET is_read = 1, read_at = NOW() WHERE message_id = ? AND recipient_id = ?',
        [id, userId]
      );
    }
    
    // Hole alle Empfänger (für Admin)
    let recipients = [];
    if (req.user.role === 'admin') {
      const [recipientList] = await connection.execute(`
        SELECT 
          mr.*,
          u.email,
          CONCAT(sp.first_name, ' ', sp.last_name) as name
        FROM message_recipients mr
        JOIN users u ON mr.recipient_id = u.id
        LEFT JOIN staff_profiles sp ON u.id = sp.user_id
        WHERE mr.message_id = ?
      `, [id]);
      recipients = recipientList;
    }
    
    await connection.commit();
    
    res.json({
      ...message,
      recipients: recipients.length > 0 ? recipients : undefined
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Abrufen der Nachricht:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Nachricht' 
    });
  } finally {
    connection.release();
  }
};

// Neue Nachricht senden
const sendMessage = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validierungsfehler', 
        errors: errors.array() 
      });
    }
    
    const senderId = req.user.id;
    const { 
      recipient_ids, 
      send_to_all, 
      subject, 
      content, 
      priority = 'normal' 
    } = req.body;
    
    // Erstelle Nachricht
    const [result] = await connection.execute(
      'INSERT INTO messages (sender_id, subject, content, priority, is_global) VALUES (?, ?, ?, ?, ?)',
      [senderId, subject, content, priority, send_to_all ? 1 : 0]
    );
    
    const messageId = result.insertId;
    
    // Bestimme Empfänger
    let recipients = [];
    
    if (send_to_all) {
      // An alle aktiven Mitarbeiter
      const [allStaff] = await connection.execute(`
        SELECT u.id as user_id, u.email, sp.first_name
        FROM users u
        LEFT JOIN staff_profiles sp ON u.id = sp.user_id
        WHERE u.is_active = 1 AND u.role IN ('staff', 'admin') AND u.id != ?
      `, [senderId]);
      
      recipients = allStaff.map(s => ({
        user_id: s.user_id,
        email: s.email,
        firstName: s.first_name || 'Mitarbeiter'
      }));
    } else if (recipient_ids && recipient_ids.length > 0) {
      // An ausgewählte Empfänger
      const placeholders = recipient_ids.map(() => '?').join(',');
      const [selectedStaff] = await connection.execute(`
        SELECT u.id as user_id, u.email, sp.first_name
        FROM users u
        LEFT JOIN staff_profiles sp ON u.id = sp.user_id
        WHERE u.id IN (${placeholders}) AND u.is_active = 1
      `, recipient_ids);
      
      recipients = selectedStaff.map(s => ({
        user_id: s.user_id,
        email: s.email,
        firstName: s.first_name || 'Mitarbeiter'
      }));
    }
    
    if (recipients.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Keine gültigen Empfänger gefunden' 
      });
    }
    
    // Erstelle Empfänger-Einträge
    const recipientValues = recipients.map(r => [messageId, r.user_id]);
    await connection.query(
      'INSERT INTO message_recipients (message_id, recipient_id) VALUES ?',
      [recipientValues]
    );
    
    // Sende E-Mail-Benachrichtigungen
    const emailRecipients = recipients.map(r => ({
      email: r.email,
      firstName: r.firstName
    }));
    
    // Asynchron senden
    sendBulkEmail(
      emailRecipients,
      'Neue Nachricht: {{subject}}',
      'Hallo {{firstName}},\n\nSie haben eine neue Nachricht mit dem Betreff "{{subject}}" erhalten.\n\nBitte melden Sie sich in der App an, um die Nachricht zu lesen.',
      '<p>Hallo {{firstName}},</p><p>Sie haben eine neue Nachricht mit dem Betreff "<strong>{{subject}}</strong>" erhalten.</p><p>Bitte melden Sie sich in der App an, um die Nachricht zu lesen.</p>'
    ).then(results => {
      console.log('E-Mail-Versand abgeschlossen:', results.filter(r => r.success).length, 'erfolgreich');
    }).catch(err => {
      console.error('Fehler beim E-Mail-Versand:', err);
    });
    
    // Aktivitätslog
    await connection.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'message_sent', 'message', ?, ?)`,
      [
        senderId,
        messageId,
        JSON.stringify({
          subject,
          recipientCount: recipients.length,
          priority,
          isGlobal: send_to_all
        })
      ]
    );
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Nachricht erfolgreich gesendet',
      messageId,
      recipientCount: recipients.length
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Fehler beim Senden der Nachricht:', error);
    res.status(500).json({ 
      message: 'Fehler beim Senden der Nachricht' 
    });
  } finally {
    connection.release();
  }
};

// Nachricht als gelesen markieren
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const [result] = await db.execute(
      'UPDATE message_recipients SET is_read = 1, read_at = NOW() WHERE message_id = ? AND recipient_id = ? AND is_read = 0',
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        message: 'Nachricht nicht gefunden oder bereits gelesen' 
      });
    }
    
    res.json({
      message: 'Nachricht als gelesen markiert'
    });
    
  } catch (error) {
    console.error('Fehler beim Markieren als gelesen:', error);
    res.status(500).json({ 
      message: 'Fehler beim Markieren der Nachricht' 
    });
  }
};

// Nachricht als ungelesen markieren
const markAsUnread = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const [result] = await db.execute(
      'UPDATE message_recipients SET is_read = 0, read_at = NULL WHERE message_id = ? AND recipient_id = ?',
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        message: 'Nachricht nicht gefunden' 
      });
    }
    
    res.json({
      message: 'Nachricht als ungelesen markiert'
    });
    
  } catch (error) {
    console.error('Fehler beim Markieren als ungelesen:', error);
    res.status(500).json({ 
      message: 'Fehler beim Markieren der Nachricht' 
    });
  }
};

// Nachricht löschen (soft delete)
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const [result] = await db.execute(
      'UPDATE message_recipients SET is_deleted = 1, deleted_at = NOW() WHERE message_id = ? AND recipient_id = ?',
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        message: 'Nachricht nicht gefunden' 
      });
    }
    
    res.json({
      message: 'Nachricht gelöscht'
    });
    
  } catch (error) {
    console.error('Fehler beim Löschen der Nachricht:', error);
    res.status(500).json({ 
      message: 'Fehler beim Löschen der Nachricht' 
    });
  }
};

// Gesendete Nachrichten abrufen
const getSentMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        m.*,
        COUNT(DISTINCT mr.recipient_id) as recipient_count,
        COUNT(DISTINCT CASE WHEN mr.is_read = 1 THEN mr.recipient_id END) as read_count
      FROM messages m
      LEFT JOIN message_recipients mr ON m.id = mr.message_id
      WHERE m.sender_id = ?
      GROUP BY m.id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [messages] = await db.execute(query, [userId, parseInt(limit), parseInt(offset)]);
    
    // Count total
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM messages WHERE sender_id = ?',
      [userId]
    );
    const total = countResult[0].total;
    
    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen gesendeter Nachrichten:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Nachrichten' 
    });
  }
};

// Nachrichtenstatistiken
const getMessageStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [stats] = await db.execute(`
      SELECT 
        COUNT(CASE WHEN mr.is_read = 0 THEN 1 END) as unread,
        COUNT(*) as total_received,
        COUNT(CASE WHEN m.priority = 'high' AND mr.is_read = 0 THEN 1 END) as unread_high_priority
      FROM message_recipients mr
      JOIN messages m ON mr.message_id = m.id
      WHERE mr.recipient_id = ? AND mr.is_deleted = 0
    `, [userId]);
    
    const [sentStats] = await db.execute(
      'SELECT COUNT(*) as total_sent FROM messages WHERE sender_id = ?',
      [userId]
    );
    
    res.json({
      ...stats[0],
      ...sentStats[0]
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Statistiken:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Statistiken' 
    });
  }
};

// Verfügbare Empfänger abrufen (für Autocomplete)
const getAvailableRecipients = async (req, res) => {
  try {
    const { search } = req.query;
    const userId = req.user.id;
    
    let query = `
      SELECT 
        u.id,
        u.email,
        u.role,
        CONCAT(sp.first_name, ' ', sp.last_name) as name,
        sp.personal_code
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.is_active = 1 
        AND u.id != ?
        AND u.role IN ('staff', 'admin')
    `;
    
    const params = [userId];
    
    if (search) {
      query += ` AND (
        sp.first_name LIKE ? OR 
        sp.last_name LIKE ? OR 
        CONCAT(sp.first_name, ' ', sp.last_name) LIKE ? OR
        u.email LIKE ? OR
        sp.personal_code LIKE ?
      )`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }
    
    query += ' ORDER BY sp.last_name, sp.first_name LIMIT 50';
    
    const [recipients] = await db.execute(query, params);
    
    res.json({ recipients });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Empfänger:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Empfänger' 
    });
  }
};

module.exports = {
  getMessages,
  getMessage,
  sendMessage,
  markAsRead,
  markAsUnread,
  deleteMessage,
  getSentMessages,
  getMessageStats,
  getAvailableRecipients
};


