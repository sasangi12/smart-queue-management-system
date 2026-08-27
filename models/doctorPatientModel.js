const db = require("../config/db");

// =====================================================
// Get Every Patient This Doctor Has Ever Treated
// -----------------------------------------------------
// "Treated" = has at least one non-cancelled appointment
// with this doctor, across ANY date (past or future).
// Optional search filters by name or phone. Each row
// includes a visit_count and last_visit_date computed via
// correlated subqueries, so the list page can show a
// useful summary without a second round trip per patient.
// =====================================================

exports.getPatientsSeenByDoctor = (doctor_id, searchTerm, callback) => {

    const likeTerm = "%" + (searchTerm || "") + "%";

    const sql = `
        SELECT DISTINCT
            p.patient_id,
            u.full_name AS patient_name,
            u.phone,
            u.email,
            (
                SELECT COUNT(*)
                FROM appointments a2
                INNER JOIN doctor_schedule ds2 ON a2.schedule_id = ds2.schedule_id
                WHERE a2.patient_id = p.patient_id
                AND ds2.doctor_id = ?
                AND a2.status != 'Cancelled'
            ) AS visit_count,
            (
                SELECT MAX(ds3.date)
                FROM appointments a3
                INNER JOIN doctor_schedule ds3 ON a3.schedule_id = ds3.schedule_id
                WHERE a3.patient_id = p.patient_id
                AND ds3.doctor_id = ?
                AND a3.status != 'Cancelled'
            ) AS last_visit_date
        FROM appointments a
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        INNER JOIN patients p ON a.patient_id = p.patient_id
        INNER JOIN users u ON p.user_id = u.user_id
        WHERE ds.doctor_id = ?
        AND (u.full_name LIKE ? OR u.phone LIKE ?)
        ORDER BY last_visit_date DESC
    `;

    db.query(sql, [doctor_id, doctor_id, doctor_id, likeTerm, likeTerm], callback);

};

// =====================================================
// Get Basic Info for One Patient (header display only)
// =====================================================

exports.getPatientBasicInfo = (patient_id, callback) => {

    const sql = `
        SELECT p.patient_id, p.gender, p.dob, u.full_name, u.email, u.phone, u.profile_image
        FROM patients p
        INNER JOIN users u ON p.user_id = u.user_id
        WHERE p.patient_id = ?
    `;

    db.query(sql, [patient_id], callback);

};

// =====================================================
// Get a Patient's Full Visit History -- WITH THIS DOCTOR ONLY
// -----------------------------------------------------
// Deliberately scoped to ds.doctor_id = ? -- a doctor can
// see a patient's history of visits to THEM, not the
// patient's visits to other doctors. If this returns zero
// rows, the doctor has never actually treated this patient,
// which the controller treats as "not found" rather than
// showing an empty page for an unrelated patient_id.
// =====================================================

exports.getPatientHistoryWithDoctor = (doctor_id, patient_id, callback) => {

    const sql = `
        SELECT
            a.appointment_id,
            a.status AS appointment_status,
            a.appointment_date,
            a.created_at,
            ds.start_time,
            ds.end_time,
            c.clinic_name,
            q.queue_number,
            q.queue_status,
            q.priority_type
        FROM appointments a
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        LEFT JOIN queues q ON q.appointment_id = a.appointment_id
        WHERE ds.doctor_id = ?
        AND a.patient_id = ?
        ORDER BY a.appointment_date DESC, ds.start_time DESC
    `;

    db.query(sql, [doctor_id, patient_id], callback);

};
