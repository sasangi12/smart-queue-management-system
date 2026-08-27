const db = require("../config/db");

// =====================================================
// Save a Contact Form Submission
// -----------------------------------------------------
// No admin "Manage Messages" page exists yet to read these
// back out -- this just captures submissions so they're
// not lost. If you want an inbox view for these later
// (e.g. under Admin), this table is already shaped for it
// (is_read included on purpose for that).
// =====================================================

exports.createMessage = (data, callback) => {

    const sql = `
        INSERT INTO contact_messages
        (full_name, email, phone, subject, message)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [data.full_name, data.email, data.phone || null, data.subject, data.message],
        callback
    );

};