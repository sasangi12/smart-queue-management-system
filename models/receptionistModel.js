const db = require("../config/db");

// =====================================================
// Note: unlike doctors/patients, a Receptionist has no
// dedicated table of their own -- their info lives
// entirely on `users`. Everything below is HOSPITAL-WIDE
// (not scoped to one doctor), matching the front-desk role.
// =====================================================

// =====================================================
// Count Today's Appointments (all doctors, all clinics)
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
// Count Total Registered Patients (system-wide)
// =====================================================

exports.countTotalPatients = (callback) => {

    const sql = `SELECT COUNT(*) AS total FROM patients`;

    db.query(sql, callback);

};

// =====================================================
// Count Today's Active Clinic Sessions (all doctors)
// =====================================================

exports.countTodaySessions = (callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM doctor_schedule
        WHERE date = CURDATE()
    `;

    db.query(sql, callback);

};

// =====================================================
// Count Patients Currently Waiting (all queues, today)
// =====================================================

exports.countWaitingToday = (callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM queues q
        INNER JOIN appointments a ON q.appointment_id = a.appointment_id
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        WHERE ds.date = CURDATE()
        AND q.queue_status = 'Waiting'
    `;

    db.query(sql, callback);

};

// =====================================================
// Today's Full Appointment Overview (dashboard preview)
// =====================================================

exports.getTodayAppointmentsOverview = (callback) => {

    const sql = `
        SELECT
            a.appointment_id,
            a.status AS appointment_status,
            ds.start_time,
            ds.end_time,
            c.clinic_name,
            du.full_name AS doctor_name,
            pu.full_name AS patient_name,
            pu.phone AS patient_phone,
            q.queue_number,
            q.queue_status
        FROM appointments a
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        INNER JOIN doctors d ON ds.doctor_id = d.doctor_id
        INNER JOIN users du ON d.user_id = du.user_id
        INNER JOIN patients p ON a.patient_id = p.patient_id
        INNER JOIN users pu ON p.user_id = pu.user_id
        LEFT JOIN queues q ON q.appointment_id = a.appointment_id
        WHERE ds.date = CURDATE()
        AND a.status != 'Cancelled'
        ORDER BY
            CASE WHEN q.queue_position IS NULL THEN 1 ELSE 0 END,
            ds.start_time ASC
    `;

    db.query(sql, callback);

};

// =====================================================
// REGISTER PATIENT PAGE: Search/List Registered Patients
// =====================================================

exports.getPatientsList = (searchTerm, callback) => {

    const likeTerm = "%" + (searchTerm || "") + "%";

    const sql = `
        SELECT
            p.patient_id, p.nic, p.gender, p.dob,
            u.full_name, u.email, u.phone, u.created_at
        FROM patients p
        INNER JOIN users u ON p.user_id = u.user_id
        WHERE u.full_name LIKE ? OR u.phone LIKE ? OR p.nic LIKE ?
        ORDER BY u.created_at DESC
        LIMIT 20
    `;

    db.query(sql, [likeTerm, likeTerm, likeTerm], callback);

};

// =====================================================
// APPOINTMENTS PAGE: Hospital-Wide List for a Given Date
// -----------------------------------------------------
// Reused as-is by the Queue Overview page too, for its
// "Full Queue Record" table -- same data (doctor, clinic,
// patient, queue fields), no need for a second query.
// =====================================================

exports.getAppointmentsByDate = (date, callback) => {

    const sql = `
        SELECT
            a.appointment_id,
            a.status AS appointment_status,
            ds.schedule_id,
            ds.start_time,
            ds.end_time,
            c.clinic_name,
            du.full_name AS doctor_name,
            p.patient_id,
            pu.full_name AS patient_name,
            pu.phone AS patient_phone,
            q.queue_id,
            q.queue_number,
            q.queue_status,
            q.priority_type
        FROM appointments a
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        INNER JOIN doctors d ON ds.doctor_id = d.doctor_id
        INNER JOIN users du ON d.user_id = du.user_id
        INNER JOIN patients p ON a.patient_id = p.patient_id
        INNER JOIN users pu ON p.user_id = pu.user_id
        LEFT JOIN queues q ON q.appointment_id = a.appointment_id
        WHERE ds.date = ?
        ORDER BY
            CASE WHEN q.queue_position IS NULL THEN 1 ELSE 0 END,
            q.queue_position ASC
    `;

    db.query(sql, [date], callback);

};

// =====================================================
// BOOK-FOR-PATIENT: Live Patient Search (typeahead)
// =====================================================

exports.searchPatients = (searchTerm, callback) => {

    const likeTerm = "%" + (searchTerm || "") + "%";

    const sql = `
        SELECT p.patient_id, u.full_name, u.phone, p.nic
        FROM patients p
        INNER JOIN users u ON p.user_id = u.user_id
        WHERE u.full_name LIKE ? OR u.phone LIKE ? OR p.nic LIKE ?
        ORDER BY u.full_name ASC
        LIMIT 10
    `;

    db.query(sql, [likeTerm, likeTerm, likeTerm], callback);

};

// =====================================================
// APPOINTMENTS PAGE: Cancel (any patient's appointment)
// =====================================================

exports.cancelAppointmentAny = (appointment_id, callback) => {

    const sql = `
        UPDATE appointments
        SET status = 'Cancelled'
        WHERE appointment_id = ?
        AND status != 'Completed'
    `;

    db.query(sql, [appointment_id], callback);

};

// =====================================================
// QUEUE OVERVIEW: Every Clinic Session for a Date
// -----------------------------------------------------
// Hospital-wide version of doctorQueueModel.getTodaySessions
// -- no doctor_id filter, so it returns EVERY doctor's
// session for the date, each with its own Waiting count,
// Now Serving number, and Paused status, so the front desk
// can see the whole hospital's queue activity at a glance.
// =====================================================

exports.getSessionsOverview = (date, callback) => {

    const sql = `
        SELECT
            ds.schedule_id,
            ds.start_time,
            ds.end_time,
            ds.max_patients,
            ds.queue_paused,
            c.clinic_name,
            du.full_name AS doctor_name,
            (
                SELECT COUNT(*)
                FROM queues q
                INNER JOIN appointments a ON q.appointment_id = a.appointment_id
                WHERE a.schedule_id = ds.schedule_id
                AND q.queue_status = 'Waiting'
            ) AS waiting_count,
            (
                SELECT q2.queue_number
                FROM queues q2
                INNER JOIN appointments a2 ON q2.appointment_id = a2.appointment_id
                WHERE a2.schedule_id = ds.schedule_id
                AND q2.queue_status = 'Serving'
                LIMIT 1
            ) AS now_serving,
            (
                SELECT COUNT(*)
                FROM appointments a3
                WHERE a3.schedule_id = ds.schedule_id
                AND a3.status != 'Cancelled'
            ) AS total_booked
        FROM doctor_schedule ds
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        INNER JOIN doctors d ON ds.doctor_id = d.doctor_id
        INNER JOIN users du ON d.user_id = du.user_id
        WHERE ds.date = ?
        ORDER BY ds.start_time ASC
    `;

    db.query(sql, [date], callback);

};

// =====================================================
// QUEUE OVERVIEW: Patient Lookup
// -----------------------------------------------------
// Answers "where is patient X right now" phone calls --
// searches active (Waiting/Serving, non-cancelled, today
// or later) queue entries by patient name or phone.
// =====================================================

exports.getPatientQueueLookup = (searchTerm, callback) => {

    const likeTerm = "%" + (searchTerm || "") + "%";

    const sql = `
        SELECT
            a.appointment_id,
            ds.date,
            ds.start_time,
            ds.end_time,
            c.clinic_name,
            du.full_name AS doctor_name,
            pu.full_name AS patient_name,
            pu.phone AS patient_phone,
            q.queue_number,
            q.queue_status,
            q.queue_position,
            q.estimated_wait_time
        FROM appointments a
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        INNER JOIN doctors d ON ds.doctor_id = d.doctor_id
        INNER JOIN users du ON d.user_id = du.user_id
        INNER JOIN patients p ON a.patient_id = p.patient_id
        INNER JOIN users pu ON p.user_id = pu.user_id
        INNER JOIN queues q ON q.appointment_id = a.appointment_id
        WHERE (pu.full_name LIKE ? OR pu.phone LIKE ?)
        AND a.status != 'Cancelled'
        AND ds.date >= CURDATE()
        AND q.queue_status IN ('Waiting', 'Serving')
        ORDER BY ds.date ASC, ds.start_time ASC
        LIMIT 10
    `;

    db.query(sql, [likeTerm, likeTerm], callback);

};