const db = require("../config/db");

// =====================================================
// Get All Patients (with optional search)
// -----------------------------------------------------
// Includes a total_visits count per patient via a
// correlated subquery, so the list is useful at a glance
// without a second round trip per row.
// =====================================================

exports.getAllPatients = (searchTerm, callback) => {

    const likeTerm = "%" + (searchTerm || "") + "%";

    const sql = `
        SELECT
            p.patient_id, p.nic, p.gender, p.dob,
            u.user_id, u.full_name, u.email, u.phone, u.status, u.profile_image, u.created_at,
            (
                SELECT COUNT(*)
                FROM appointments a
                WHERE a.patient_id = p.patient_id
                AND a.status != 'Cancelled'
            ) AS total_visits
        FROM patients p
        INNER JOIN users u ON p.user_id = u.user_id
        WHERE u.full_name LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR p.nic LIKE ?
        ORDER BY u.created_at DESC
    `;

    db.query(sql, [likeTerm, likeTerm, likeTerm, likeTerm], callback);

};

// =====================================================
// Get a Single Patient (for the Detail page)
// =====================================================

exports.getPatientById = (patient_id, callback) => {

    const sql = `
        SELECT
            p.patient_id, p.nic, p.gender, p.dob, p.address,
            u.user_id, u.full_name, u.email, u.phone, u.status, u.profile_image, u.created_at
        FROM patients p
        INNER JOIN users u ON p.user_id = u.user_id
        WHERE p.patient_id = ?
    `;

    db.query(sql, [patient_id], callback);

};

// =====================================================
// Get a Patient's FULL Visit History -- EVERY DOCTOR
// -----------------------------------------------------
// Unlike doctorPatientModel.getPatientHistoryWithDoctor
// (deliberately scoped to ONE doctor, for privacy reasons
// covered when that module was built), an administrator
// legitimately needs the system-wide picture across every
// doctor and clinic -- this is the admin-only equivalent.
// =====================================================

exports.getPatientVisitHistory = (patient_id, callback) => {

    const sql = `
        SELECT
            a.appointment_id,
            a.status AS appointment_status,
            a.appointment_date,
            ds.start_time,
            ds.end_time,
            c.clinic_name,
            du.full_name AS doctor_name,
            q.queue_number,
            q.queue_status,
            q.priority_type
        FROM appointments a
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        INNER JOIN doctors d ON ds.doctor_id = d.doctor_id
        INNER JOIN users du ON d.user_id = du.user_id
        LEFT JOIN queues q ON q.appointment_id = a.appointment_id
        WHERE a.patient_id = ?
        ORDER BY a.appointment_date DESC, ds.start_time DESC
    `;

    db.query(sql, [patient_id], callback);

};

// =====================================================
// Toggle Patient Status (Active / Inactive)
// -----------------------------------------------------
// Same reasoning as Manage Doctors / Manage Clinics --
// no hard delete, since a patient with existing
// appointment/queue history can't be removed without
// breaking those records. Deactivating blocks their login
// (authController already checks status on every login,
// regardless of role) without touching their history.
// =====================================================

exports.setPatientStatus = (user_id, newStatus, callback) => {

    const sql = `UPDATE users SET status = ? WHERE user_id = ?`;

    db.query(sql, [newStatus, user_id], callback);

};