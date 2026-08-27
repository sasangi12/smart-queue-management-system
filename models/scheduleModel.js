const db = require("../config/db");

// =====================================================
// Get Upcoming Schedules for a Clinic
// -----------------------------------------------------
// Joins doctor_schedule -> doctors -> users so we get the
// doctor's name, and counts existing (non-cancelled)
// appointments per schedule so the form can show/hide
// slots that are already full.
// =====================================================

exports.getSchedulesByClinic = (clinic_id, callback) => {

    const sql = `
        SELECT
            ds.schedule_id,
            ds.date,
            ds.start_time,
            ds.end_time,
            ds.max_patients,
            d.doctor_id,
            d.specialization,
            d.room_no,
            u.full_name AS doctor_name,
            (
                SELECT COUNT(*)
                FROM appointments a
                WHERE a.schedule_id = ds.schedule_id
                AND a.status != 'Cancelled'
            ) AS booked_count
        FROM doctor_schedule ds
        INNER JOIN doctors d ON ds.doctor_id = d.doctor_id
        INNER JOIN users u ON d.user_id = u.user_id
        WHERE ds.clinic_id = ?
        AND ds.date >= CURDATE()
        ORDER BY ds.date ASC, ds.start_time ASC
    `;

    db.query(sql, [clinic_id], callback);

};

// =====================================================
// Get a Single Schedule By ID (with booked count)
// -----------------------------------------------------
// Used when the patient submits the booking form, to
// re-check slot availability on the server side before
// creating the appointment (never trust the client).
// =====================================================

exports.getScheduleById = (schedule_id, callback) => {

    const sql = `
        SELECT
            ds.schedule_id,
            ds.doctor_id,
            ds.clinic_id,
            ds.date,
            ds.start_time,
            ds.end_time,
            ds.max_patients,
            u.full_name AS doctor_name,
            (
                SELECT COUNT(*)
                FROM appointments a
                WHERE a.schedule_id = ds.schedule_id
                AND a.status != 'Cancelled'
            ) AS booked_count
        FROM doctor_schedule ds
        INNER JOIN doctors d ON ds.doctor_id = d.doctor_id
        INNER JOIN users u ON d.user_id = u.user_id
        WHERE ds.schedule_id = ?
    `;

    db.query(sql, [schedule_id], callback);

};
