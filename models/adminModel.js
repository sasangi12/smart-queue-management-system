const db = require("../config/db");

// =====================================================
// Note: like Receptionist, Admin has no dedicated table
// of their own -- their info lives entirely on `users`.
// Everything below is SYSTEM-WIDE, since an administrator
// oversees the whole hospital, not one doctor's queue or
// even just today's front-desk activity.
// =====================================================

// =====================================================
// Count Total Patients (system-wide)
// =====================================================

exports.countTotalPatients = (callback) => {

    const sql = `SELECT COUNT(*) AS total FROM patients`;

    db.query(sql, callback);

};

// =====================================================
// Count Total Doctors
// =====================================================

exports.countTotalDoctors = (callback) => {

    const sql = `SELECT COUNT(*) AS total FROM doctors`;

    db.query(sql, callback);

};

// =====================================================
// Count Total Receptionists
// -----------------------------------------------------
// Joined through `roles` by name rather than a hardcoded
// role_id -- your roles table has non-sequential IDs
// (Admin=1, Doctor=2, Patient=3, Receptionist=8), so
// matching by role_name is safer than assuming a number.
// =====================================================

exports.countTotalReceptionists = (callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE r.role_name = 'Receptionist'
    `;

    db.query(sql, callback);

};

// =====================================================
// Count Total Clinics
// =====================================================

exports.countTotalClinics = (callback) => {

    const sql = `SELECT COUNT(*) AS total FROM clinics`;

    db.query(sql, callback);

};

// =====================================================
// Count Today's Appointments (hospital-wide)
// =====================================================

exports.countTodayAppointments = (callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM appointments a
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        WHERE ds.date = CURDATE()
        AND a.status != 'Cancelled'
    `;

    db.query(sql, callback);

};

// =====================================================
// Get Recently Registered Users (any role)
// -----------------------------------------------------
// A quick "who joined recently" list for the dashboard --
// covers patients self-registering, receptionists
// registering walk-ins, and any staff account an admin
// creates later (User Management page, not built yet).
// =====================================================

exports.getRecentRegistrations = (limit, callback) => {

    const sql = `
        SELECT u.user_id, u.full_name, u.email, u.phone, u.created_at, r.role_name
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        ORDER BY u.created_at DESC
        LIMIT ?
    `;

    db.query(sql, [Number(limit)], callback);

};

// =====================================================
// Get Today's Appointment Count Per Clinic
// -----------------------------------------------------
// Uses LEFT JOINs so a clinic with zero bookings today
// still shows up with a count of 0, instead of being
// silently dropped from the list.
// =====================================================

exports.getClinicActivityToday = (callback) => {

    const sql = `
        SELECT
            c.clinic_id,
            c.clinic_name,
            COUNT(a.appointment_id) AS today_count
        FROM clinics c
        LEFT JOIN doctor_schedule ds ON ds.clinic_id = c.clinic_id AND ds.date = CURDATE()
        LEFT JOIN appointments a ON a.schedule_id = ds.schedule_id AND a.status != 'Cancelled'
        GROUP BY c.clinic_id, c.clinic_name
        ORDER BY today_count DESC
    `;

    db.query(sql, callback);

};