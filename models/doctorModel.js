const db = require("../config/db");

// =====================================================
// Get Doctor Record (joined with users for name/contact/photo)
// =====================================================

exports.getDoctorByUserId = (user_id, callback) => {

    const sql = `
        SELECT
            d.doctor_id, d.user_id, d.specialization, d.qualification, d.room_no,
            u.full_name, u.email, u.phone, u.profile_image
        FROM doctors d
        INNER JOIN users u ON d.user_id = u.user_id
        WHERE d.user_id = ?
    `;

    db.query(sql, [user_id], callback);

};

// =====================================================
// Get Today's Appointments for a Doctor (dashboard use)
// =====================================================

exports.getTodayAppointments = (doctor_id, callback) => {

    const sql = `
        SELECT
            a.appointment_id,
            a.status AS appointment_status,
            ds.schedule_id,
            ds.start_time,
            ds.end_time,
            c.clinic_name,
            p.patient_id,
            u.full_name AS patient_name,
            u.phone AS patient_phone,
            q.queue_id,
            q.queue_number,
            q.queue_position,
            q.queue_status,
            q.priority_type,
            q.estimated_wait_time
        FROM appointments a
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        INNER JOIN patients p ON a.patient_id = p.patient_id
        INNER JOIN users u ON p.user_id = u.user_id
        LEFT JOIN queues q ON q.appointment_id = a.appointment_id
        WHERE ds.doctor_id = ?
        AND ds.date = CURDATE()
        AND a.status != 'Cancelled'
        ORDER BY
            CASE WHEN q.queue_position IS NULL THEN 1 ELSE 0 END,
            q.queue_position ASC
    `;

    db.query(sql, [doctor_id], callback);

};

// =====================================================
// Get ALL Appointments for a Doctor on a Specific Date
// =====================================================

exports.getAppointmentsByDate = (doctor_id, date, callback) => {

    const sql = `
        SELECT
            a.appointment_id,
            a.status AS appointment_status,
            a.appointment_date,
            ds.schedule_id,
            ds.start_time,
            ds.end_time,
            c.clinic_name,
            p.patient_id,
            u.full_name AS patient_name,
            u.phone AS patient_phone,
            u.email AS patient_email,
            q.queue_id,
            q.queue_number,
            q.queue_position,
            q.queue_status,
            q.priority_type,
            q.estimated_wait_time
        FROM appointments a
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        INNER JOIN patients p ON a.patient_id = p.patient_id
        INNER JOIN users u ON p.user_id = u.user_id
        LEFT JOIN queues q ON q.appointment_id = a.appointment_id
        WHERE ds.doctor_id = ?
        AND ds.date = ?
        ORDER BY
            CASE WHEN q.queue_position IS NULL THEN 1 ELSE 0 END,
            q.queue_position ASC
    `;

    db.query(sql, [doctor_id, date], callback);

};

// =====================================================
// Count Total Distinct Patients Ever Seen by This Doctor
// =====================================================

exports.countTotalPatients = (doctor_id, callback) => {

    const sql = `
        SELECT COUNT(DISTINCT a.patient_id) AS total
        FROM appointments a
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        WHERE ds.doctor_id = ?
        AND a.status != 'Cancelled'
    `;

    db.query(sql, [doctor_id], callback);

};

// =====================================================
// PROFILE: Update Doctor-Specific Fields
// -----------------------------------------------------
// full_name/email/phone live on `users` and are updated
// via profileModel (shared/generic, reused as-is since
// that table has no role-specific columns). This handles
// only the columns unique to `doctors`.
// =====================================================

exports.updateDoctorInfo = (doctor_id, data, callback) => {

    const sql = `
        UPDATE doctors
        SET specialization = ?, qualification = ?, room_no = ?
        WHERE doctor_id = ?
    `;

    db.query(sql, [data.specialization, data.qualification, data.room_no, doctor_id], callback);

};
