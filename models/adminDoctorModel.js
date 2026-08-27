const db = require("../config/db");

// =====================================================
// Get All Doctors (with optional search)
// -----------------------------------------------------
// Searches by name, specialization, or email so an admin
// can find a doctor without knowing their exact details.
// =====================================================

exports.getAllDoctors = (searchTerm, callback) => {

    const likeTerm = "%" + (searchTerm || "") + "%";

    const sql = `
        SELECT
            d.doctor_id, d.specialization, d.qualification, d.room_no,
            u.user_id, u.full_name, u.email, u.phone, u.status, u.profile_image, u.created_at
        FROM doctors d
        INNER JOIN users u ON d.user_id = u.user_id
        WHERE u.full_name LIKE ? OR d.specialization LIKE ? OR u.email LIKE ?
        ORDER BY u.full_name ASC
    `;

    db.query(sql, [likeTerm, likeTerm, likeTerm], callback);

};

// =====================================================
// Get a Single Doctor (for the Edit page)
// =====================================================

exports.getDoctorById = (doctor_id, callback) => {

    const sql = `
        SELECT
            d.doctor_id, d.specialization, d.qualification, d.room_no,
            u.user_id, u.full_name, u.email, u.phone, u.status, u.profile_image
        FROM doctors d
        INNER JOIN users u ON d.user_id = u.user_id
        WHERE d.doctor_id = ?
    `;

    db.query(sql, [doctor_id], callback);

};

// =====================================================
// Create the `doctors` Row for a New Doctor Account
// -----------------------------------------------------
// The matching `users` row (role_id = Doctor) is created
// first via userModel.createUser -- this just adds the
// doctor-specific fields on top, same two-step pattern
// used by registration everywhere else in this project.
// =====================================================

exports.createDoctorRecord = (user_id, data, callback) => {

    const sql = `
        INSERT INTO doctors (user_id, specialization, qualification, room_no)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [user_id, data.specialization, data.qualification, data.room_no], callback);

};

// =====================================================
// Toggle a Doctor's Account Status (Active / Inactive)
// -----------------------------------------------------
// Deliberately NOT a hard delete -- a doctor with existing
// appointment/queue history can't be removed without
// breaking every past record that references them (and
// your schema has no CASCADE rules to fall back on).
// Deactivating hides them from new bookings while keeping
// history intact. See the README for more on this.
// =====================================================

exports.setDoctorStatus = (user_id, newStatus, callback) => {

    const sql = `UPDATE users SET status = ? WHERE user_id = ?`;

    db.query(sql, [newStatus, user_id], callback);

};