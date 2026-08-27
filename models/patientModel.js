const db = require("../config/db");

// ===============================
// Get Patient Record by User ID
// -------------------------------
// req.session.user only stores user_id (from the users
// table). Booking needs patient_id (from the patients
// table), so this bridges the two.
// ===============================

exports.getPatientByUserId = (user_id, callback) => {

    const sql = "SELECT * FROM patients WHERE user_id = ?";

    db.query(sql, [user_id], callback);

};
