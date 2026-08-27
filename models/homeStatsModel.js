const db = require("../config/db");

// =====================================================
// Homepage Live Stats
// -----------------------------------------------------
// Kept as its own small file rather than merged into
// adminModel.js/doctorModel.js -- those files already
// have similar queries (adminModel.countTotalDoctors,
// etc.), but this file is intentionally standalone so the
// public homepage's data needs don't get tangled up with
// admin-only logic. A small amount of query duplication
// (countTotalDoctors exists in both places) is an
// acceptable tradeoff for keeping this page independent.
// =====================================================

// =====================================================
// Total Doctors (system-wide)
// =====================================================

exports.countTotalDoctors = (callback) => {

    const sql = `SELECT COUNT(*) AS total FROM doctors`;

    db.query(sql, callback);

};

// =====================================================
// Total Patients Served
// -----------------------------------------------------
// Counts COMPLETED appointments, not total patients --
// "served" means an actual visit happened, not just that
// someone has an account or a pending booking.
// =====================================================

exports.countPatientsServed = (callback) => {

    const sql = `SELECT COUNT(*) AS total FROM appointments WHERE status = 'Completed'`;

    db.query(sql, callback);

};

// =====================================================
// Featured Doctors (for the "Meet Our Specialists" section)
// -----------------------------------------------------
// Only Active doctors -- a deactivated doctor shouldn't be
// advertised on the public homepage as available to see.
// ORDER BY RAND() so the homepage shows a different few
// doctors on each visit, rather than the same 3 forever.
// =====================================================

exports.getFeaturedDoctors = (limit, callback) => {

    const sql = `
        SELECT d.doctor_id, d.specialization, u.full_name, u.profile_image
        FROM doctors d
        INNER JOIN users u ON d.user_id = u.user_id
        WHERE u.status = 'Active'
        ORDER BY RAND()
        LIMIT ?
    `;

    db.query(sql, [Number(limit)], callback);

};