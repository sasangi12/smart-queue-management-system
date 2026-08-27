const db = require("../config/db");

// =====================================================
// Get All Clinics (admin view -- includes Inactive ones,
// unlike clinicModel.getAllClinics which the booking
// pages use and which only shows Active clinics)
// =====================================================

exports.getAllClinics = (searchTerm, callback) => {

    const likeTerm = "%" + (searchTerm || "") + "%";

    const sql = `
        SELECT *
        FROM clinics
        WHERE clinic_name LIKE ? OR description LIKE ?
        ORDER BY clinic_name ASC
    `;

    db.query(sql, [likeTerm, likeTerm], callback);

};

// =====================================================
// Get a Single Clinic (for the Edit page)
// =====================================================

exports.getClinicById = (clinic_id, callback) => {

    const sql = `SELECT * FROM clinics WHERE clinic_id = ?`;

    db.query(sql, [clinic_id], callback);

};

// =====================================================
// Check Clinic Name Isn't Already Taken
// -----------------------------------------------------
// Your schema has no UNIQUE constraint on clinic_name, so
// this is an application-level check to stop an admin
// from accidentally creating "Dental Clinic" twice.
// =====================================================

exports.findClinicNameUsedByOthers = (clinic_name, clinic_id, callback) => {

    const sql = `
        SELECT * FROM clinics
        WHERE clinic_name = ?
        AND clinic_id != ?
    `;

    // clinic_id is 0 for a brand-new clinic (nothing to exclude yet)
    db.query(sql, [clinic_name, clinic_id || 0], callback);

};

// =====================================================
// Create a New Clinic
// =====================================================

exports.createClinic = (data, callback) => {

    const sql = `
        INSERT INTO clinics (clinic_name, description, status)
        VALUES (?, ?, 'Active')
    `;

    db.query(sql, [data.clinic_name, data.description || null], callback);

};

// =====================================================
// Update a Clinic
// =====================================================

exports.updateClinic = (clinic_id, data, callback) => {

    const sql = `
        UPDATE clinics
        SET clinic_name = ?, description = ?
        WHERE clinic_id = ?
    `;

    db.query(sql, [data.clinic_name, data.description || null, clinic_id], callback);

};

// =====================================================
// Toggle Clinic Status (Active / Inactive)
// -----------------------------------------------------
// No hard delete, same reasoning as Manage Doctors --
// a clinic with existing doctor_schedule/appointment
// history can't be removed without breaking those
// records. Deactivating hides it from new bookings
// (clinicModel.getAllClinics filters to Active only)
// while keeping everything already booked intact.
// =====================================================

exports.setClinicStatus = (clinic_id, newStatus, callback) => {

    const sql = `UPDATE clinics SET status = ? WHERE clinic_id = ?`;

    db.query(sql, [newStatus, clinic_id], callback);

};

// =====================================================
// Count Upcoming Schedules for a Clinic
// -----------------------------------------------------
// Shown on the list/edit page as a heads-up before an
// admin deactivates a clinic that still has doctors
// scheduled into it -- informational only, doesn't block
// the toggle (a doctor's already-booked sessions for a
// deactivated clinic still run as normal; deactivating
// only stops NEW bookings).
// =====================================================

exports.countUpcomingSchedules = (clinic_id, callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM doctor_schedule
        WHERE clinic_id = ?
        AND date >= CURDATE()
    `;

    db.query(sql, [clinic_id], callback);

};