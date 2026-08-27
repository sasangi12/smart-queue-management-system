const db = require("../config/db");

// =====================================================
// All queries here take a startDate/endDate range
// (YYYY-MM-DD strings) and filter against
// appointments.appointment_date, matching how every other
// date-scoped page in this project already works.
// =====================================================

// =====================================================
// Summary Counts: Total / Completed / Cancelled Appointments
// =====================================================

exports.getAppointmentSummary = (startDate, endDate, callback) => {

    const sql = `
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
        FROM appointments
        WHERE appointment_date BETWEEN ? AND ?
    `;

    db.query(sql, [startDate, endDate], callback);

};

// =====================================================
// Count Skipped Queue Entries in Range
// -----------------------------------------------------
// "Skipped" lives on `queues`, not `appointments`, so this
// is a separate query from the summary above -- counts
// patients who were called/queued but never seen.
// =====================================================

exports.getSkippedCount = (startDate, endDate, callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM queues q
        INNER JOIN appointments a ON q.appointment_id = a.appointment_id
        WHERE a.appointment_date BETWEEN ? AND ?
        AND q.queue_status = 'Skipped'
    `;

    db.query(sql, [startDate, endDate], callback);

};

// =====================================================
// Count New Patient Registrations in Range
// -----------------------------------------------------
// Based on the patient's account creation date, not their
// first visit date -- "how many new patients joined the
// system" during this period.
// =====================================================

exports.getNewPatientsCount = (startDate, endDate, callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM patients p
        INNER JOIN users u ON p.user_id = u.user_id
        WHERE DATE(u.created_at) BETWEEN ? AND ?
    `;

    db.query(sql, [startDate, endDate], callback);

};

// =====================================================
// Average Estimated Wait Time in Range (minutes)
// -----------------------------------------------------
// Uses queues.estimated_wait_time (set at booking time --
// position * 10 minutes), not a measured actual wait,
// since there's no "patient left" timestamp in the schema
// to calculate a real elapsed time from.
// =====================================================

exports.getAverageWaitTime = (startDate, endDate, callback) => {

    const sql = `
        SELECT AVG(q.estimated_wait_time) AS avg_wait
        FROM queues q
        INNER JOIN appointments a ON q.appointment_id = a.appointment_id
        WHERE a.appointment_date BETWEEN ? AND ?
        AND q.estimated_wait_time IS NOT NULL
    `;

    db.query(sql, [startDate, endDate], callback);

};

// =====================================================
// Doctor Workload Report
// -----------------------------------------------------
// LEFT JOINs so a doctor with ZERO appointments in the
// selected range still shows up with 0s, instead of
// silently disappearing from the report.
// =====================================================

exports.getDoctorWorkload = (startDate, endDate, callback) => {

    const sql = `
        SELECT
            du.full_name AS doctor_name,
            d.specialization,
            COUNT(a.appointment_id) AS total_appointments,
            SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN a.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
        FROM doctors d
        INNER JOIN users du ON d.user_id = du.user_id
        LEFT JOIN doctor_schedule ds ON ds.doctor_id = d.doctor_id
        LEFT JOIN appointments a
            ON a.schedule_id = ds.schedule_id
            AND a.appointment_date BETWEEN ? AND ?
        GROUP BY d.doctor_id, du.full_name, d.specialization
        ORDER BY total_appointments DESC
    `;

    db.query(sql, [startDate, endDate], callback);

};

// =====================================================
// Clinic Performance Report
// -----------------------------------------------------
// Same LEFT JOIN reasoning as doctor workload -- a clinic
// with no bookings in range still appears, at 0.
// =====================================================

exports.getClinicPerformance = (startDate, endDate, callback) => {

    const sql = `
        SELECT
            c.clinic_name,
            COUNT(a.appointment_id) AS total_appointments,
            SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN a.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
        FROM clinics c
        LEFT JOIN doctor_schedule ds ON ds.clinic_id = c.clinic_id
        LEFT JOIN appointments a
            ON a.schedule_id = ds.schedule_id
            AND a.appointment_date BETWEEN ? AND ?
        GROUP BY c.clinic_id, c.clinic_name
        ORDER BY total_appointments DESC
    `;

    db.query(sql, [startDate, endDate], callback);

};