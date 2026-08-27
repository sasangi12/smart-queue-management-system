const db = require("../config/db");

// =====================================================
// Receptionist has NO dedicated table (same as Admin) --
// everything lives on `users`, filtered by role via a
// join to `roles`. Matched by role_name rather than a
// hardcoded role_id, since your roles table has
// non-sequential IDs (Admin=1, Doctor=2, Patient=3,
// Receptionist=8) -- name matching is safer than assuming
// a number that could differ across installs.
// =====================================================

// =====================================================
// Get All Receptionists (with optional search)
// =====================================================

exports.getAllReceptionists = (searchTerm, callback) => {

    const likeTerm = "%" + (searchTerm || "") + "%";

    const sql = `
        SELECT u.user_id, u.full_name, u.email, u.phone, u.status, u.profile_image, u.created_at
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE r.role_name = 'Receptionist'
        AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)
        ORDER BY u.full_name ASC
    `;

    db.query(sql, [likeTerm, likeTerm, likeTerm], callback);

};

// =====================================================
// Get a Single Receptionist (for the Edit page)
// -----------------------------------------------------
// Scoped to role_name = 'Receptionist' in the WHERE
// clause too -- so this page can never accidentally load
// (or edit) an Admin/Doctor/Patient account just because
// someone guessed a user_id in the URL.
// =====================================================

exports.getReceptionistById = (user_id, callback) => {

    const sql = `
        SELECT u.user_id, u.full_name, u.email, u.phone, u.status, u.profile_image, u.created_at
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = ?
        AND r.role_name = 'Receptionist'
    `;

    db.query(sql, [user_id], callback);

};

// =====================================================
// Look Up the Receptionist role_id
// -----------------------------------------------------
// Used when creating a new receptionist account, so the
// insert never hardcodes a role_id number.
// =====================================================

exports.getReceptionistRoleId = (callback) => {

    const sql = `SELECT role_id FROM roles WHERE role_name = 'Receptionist' LIMIT 1`;

    db.query(sql, callback);

};

// =====================================================
// Toggle Receptionist Status (Active / Inactive)
// -----------------------------------------------------
// The role_name check in the WHERE clause is a second
// safety net (on top of the one in getReceptionistById
// that loaded the page) -- this UPDATE can only ever
// touch a genuine Receptionist row, even if the form's
// user_id were somehow tampered with.
// =====================================================

exports.setReceptionistStatus = (user_id, newStatus, callback) => {

    const sql = `
        UPDATE users u
        INNER JOIN roles r ON u.role_id = r.role_id
        SET u.status = ?
        WHERE u.user_id = ?
        AND r.role_name = 'Receptionist'
    `;

    db.query(sql, [newStatus, user_id], callback);

};