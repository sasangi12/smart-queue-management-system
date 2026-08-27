const db = require("../config/db");

// =====================================================
// Get All Clinics -- PATIENT/RECEPTIONIST BOOKING USE
// -----------------------------------------------------
// Filtered to status = 'Active' -- this is the function
// the Patient module's Book Appointment page and the
// Receptionist's booking form both call, so a clinic an
// admin deactivates immediately stops being selectable for
// NEW bookings, without touching any existing appointment
// history tied to it.
// =====================================================

exports.getAllClinics = (callback) => {

    const sql = "SELECT * FROM clinics WHERE status = 'Active' ORDER BY clinic_name ASC";

    db.query(sql, callback);

};

// ===============================
// Get Clinic By ID
// ===============================

exports.getClinicById = (clinic_id, callback) => {

    const sql = "SELECT * FROM clinics WHERE clinic_id = ?";

    db.query(sql, [clinic_id], callback);

};