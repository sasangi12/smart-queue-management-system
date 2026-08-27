const db = require("../config/db");

// =====================================================
// Get Full Profile (users + patients joined)
// -----------------------------------------------------
// PATIENT-SPECIFIC -- requires a matching `patients` row,
// so this only works for Patient accounts. Doctors use
// doctorModel.getDoctorByUserId instead (joins `doctors`).
// Receptionists have no second table at all, so they use
// getUserBasicInfo below.
// =====================================================

exports.getFullProfile = (user_id, callback) => {

    const sql = `
        SELECT
            u.user_id, u.full_name, u.email, u.phone, u.status, u.created_at, u.profile_image,
            p.patient_id, p.nic, p.gender, p.dob, p.address
        FROM users u
        INNER JOIN patients p ON u.user_id = p.user_id
        WHERE u.user_id = ?
    `;

    db.query(sql, [user_id], callback);

};

// =====================================================
// Get Basic User Info Only (no second table join)
// -----------------------------------------------------
// GENERIC -- works for any role, since it only touches
// `users`. Used by the Receptionist profile page (and
// would work for Admin too, if that module ever needs it),
// since neither has a dedicated role-specific table the
// way doctors/patients do.
// =====================================================

exports.getUserBasicInfo = (user_id, callback) => {

    const sql = `
        SELECT user_id, full_name, email, phone, profile_image, status, created_at
        FROM users
        WHERE user_id = ?
    `;

    db.query(sql, [user_id], callback);

};

// =====================================================
// Check Email Belongs to Someone Else
// -----------------------------------------------------
// GENERIC -- users table only, works for any role.
// =====================================================

exports.findEmailUsedByOthers = (email, user_id, callback) => {

    const sql = `
        SELECT * FROM users
        WHERE email = ?
        AND user_id != ?
    `;

    db.query(sql, [email, user_id], callback);

};

// =====================================================
// Check NIC Belongs to Someone Else
// -----------------------------------------------------
// PATIENT-SPECIFIC (nic lives on `patients`).
// =====================================================

exports.findNicUsedByOthers = (nic, patient_id, callback) => {

    const sql = `
        SELECT * FROM patients
        WHERE nic = ?
        AND patient_id != ?
    `;

    db.query(sql, [nic, patient_id], callback);

};

// =====================================================
// Update users table (full_name, email, phone)
// -----------------------------------------------------
// GENERIC -- works for any role.
// =====================================================

exports.updateUserInfo = (user_id, data, callback) => {

    const sql = `
        UPDATE users
        SET full_name = ?, email = ?, phone = ?
        WHERE user_id = ?
    `;

    db.query(sql, [data.full_name, data.email, data.phone, user_id], callback);

};

// =====================================================
// Update patients table (nic, gender, dob, address)
// -----------------------------------------------------
// PATIENT-SPECIFIC.
// =====================================================

exports.updatePatientInfo = (patient_id, data, callback) => {

    const sql = `
        UPDATE patients
        SET nic = ?, gender = ?, dob = ?, address = ?
        WHERE patient_id = ?
    `;

    db.query(sql, [data.nic, data.gender, data.dob, data.address, patient_id], callback);

};

// =====================================================
// Get Current Password Hash
// -----------------------------------------------------
// GENERIC -- works for any role.
// =====================================================

exports.getPasswordHash = (user_id, callback) => {

    const sql = `SELECT password FROM users WHERE user_id = ?`;

    db.query(sql, [user_id], callback);

};

// =====================================================
// Update Password
// -----------------------------------------------------
// GENERIC -- works for any role.
// =====================================================

exports.updatePassword = (user_id, hashedPassword, callback) => {

    const sql = `UPDATE users SET password = ? WHERE user_id = ?`;

    db.query(sql, [hashedPassword, user_id], callback);

};

// =====================================================
// PROFILE IMAGE -- all GENERIC, works for any role
// =====================================================

exports.getProfileImagePath = (user_id, callback) => {

    const sql = `SELECT profile_image FROM users WHERE user_id = ?`;

    db.query(sql, [user_id], callback);

};

exports.updateProfileImage = (user_id, imagePath, callback) => {

    const sql = `UPDATE users SET profile_image = ? WHERE user_id = ?`;

    db.query(sql, [imagePath, user_id], callback);

};

exports.deleteProfileImage = (user_id, callback) => {

    const sql = `UPDATE users SET profile_image = NULL WHERE user_id = ?`;

    db.query(sql, [user_id], callback);

};