const db = require("../config/db");

// =====================================================
// Check If Patient Already Booked This Schedule
// =====================================================

exports.findExistingBooking = (patient_id, schedule_id, callback) => {

    const sql = `
        SELECT * FROM appointments
        WHERE patient_id = ?
        AND schedule_id = ?
        AND status != 'Cancelled'
    `;

    db.query(sql, [patient_id, schedule_id], callback);

};

// ===============================
// Create Appointment
// ===============================

exports.createAppointment = (appointmentData, callback) => {

    const sql = `
        INSERT INTO appointments
        (patient_id, schedule_id, appointment_date, status)
        VALUES (?, ?, ?, 'Confirmed')
    `;

    db.query(sql, appointmentData, callback);

};

// =====================================================
// Get Appointments for a Patient (full history, used by
// the "My Appointments" page)
// =====================================================

exports.getAppointmentsByPatient = (patient_id, callback) => {

    const sql = `
        SELECT
            ap.appointment_id,
            ap.appointment_date,
            ap.status,
            ap.created_at,
            ds.schedule_id,
            ds.start_time,
            ds.end_time,
            c.clinic_name,
            u.full_name AS doctor_name,
            d.specialization,
            d.room_no,
            q.queue_number,
            q.queue_position,
            q.estimated_wait_time,
            q.queue_status,
            q.priority_type
        FROM appointments ap
        INNER JOIN doctor_schedule ds ON ap.schedule_id = ds.schedule_id
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        INNER JOIN doctors d ON ds.doctor_id = d.doctor_id
        INNER JOIN users u ON d.user_id = u.user_id
        LEFT JOIN queues q ON q.appointment_id = ap.appointment_id
        WHERE ap.patient_id = ?
        ORDER BY ap.appointment_date DESC, ds.start_time DESC
    `;

    db.query(sql, [patient_id], callback);

};

// =====================================================
// Get a Single Appointment (ownership check included)
// =====================================================

exports.getAppointmentByIdForPatient = (appointment_id, patient_id, callback) => {

    const sql = `
        SELECT ap.*, ds.date AS schedule_date, ds.start_time
        FROM appointments ap
        INNER JOIN doctor_schedule ds ON ap.schedule_id = ds.schedule_id
        WHERE ap.appointment_id = ?
        AND ap.patient_id = ?
    `;

    db.query(sql, [appointment_id, patient_id], callback);

};

// =====================================================
// Cancel Appointment
// =====================================================

exports.cancelAppointment = (appointment_id, patient_id, callback) => {

    const sql = `
        UPDATE appointments
        SET status = 'Cancelled'
        WHERE appointment_id = ?
        AND patient_id = ?
        AND status != 'Completed'
    `;

    db.query(sql, [appointment_id, patient_id], callback);

};

// =====================================================
// DASHBOARD: Count Total Appointments for a Patient
// =====================================================

exports.countAppointmentsByPatient = (patient_id, callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM appointments
        WHERE patient_id = ?
        AND status != 'Cancelled'
    `;

    db.query(sql, [patient_id], callback);

};

// =====================================================
// DASHBOARD: Get the Soonest Upcoming Appointment
// -----------------------------------------------------
// Used for the "Next Appointment" stat card.
// =====================================================

exports.getNextAppointment = (patient_id, callback) => {

    const sql = `
        SELECT
            ap.appointment_id,
            ap.appointment_date,
            ap.status,
            ds.start_time,
            ds.end_time,
            c.clinic_name,
            u.full_name AS doctor_name
        FROM appointments ap
        INNER JOIN doctor_schedule ds ON ap.schedule_id = ds.schedule_id
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        INNER JOIN doctors d ON ds.doctor_id = d.doctor_id
        INNER JOIN users u ON d.user_id = u.user_id
        WHERE ap.patient_id = ?
        AND ap.status IN ('Confirmed', 'Pending')
        AND ds.date >= CURDATE()
        ORDER BY ds.date ASC, ds.start_time ASC
        LIMIT 1
    `;

    db.query(sql, [patient_id], callback);

};

// =====================================================
// DASHBOARD: Get Most Recently Booked Appointments
// -----------------------------------------------------
// Used for the "Recent Appointments" table — ordered by
// when the booking was MADE (created_at), not the visit
// date, so a newly booked future visit shows up first.
// =====================================================

exports.getRecentAppointments = (patient_id, limit, callback) => {

    const sql = `
        SELECT
            ap.appointment_id,
            ap.appointment_date,
            ap.status,
            ap.created_at,
            ds.start_time,
            ds.end_time,
            c.clinic_name,
            u.full_name AS doctor_name,
            d.specialization
        FROM appointments ap
        INNER JOIN doctor_schedule ds ON ap.schedule_id = ds.schedule_id
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        INNER JOIN doctors d ON ds.doctor_id = d.doctor_id
        INNER JOIN users u ON d.user_id = u.user_id
        WHERE ap.patient_id = ?
        ORDER BY ap.created_at DESC
        LIMIT ?
    `;

    db.query(sql, [patient_id, Number(limit)], callback);

};
