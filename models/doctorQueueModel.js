const db = require("../config/db");

// =====================================================
// Get Today's Sessions for a Doctor
// -----------------------------------------------------
// A doctor can have more than one doctor_schedule row on
// the same day (e.g. a morning clinic + an afternoon
// clinic), each with its OWN independent queue. This
// lists them as selectable "sessions" for the Manage
// Queue page, with a quick Waiting/Serving summary for
// each so the doctor can tell at a glance which session
// needs attention.
// =====================================================

exports.getTodaySessions = (doctor_id, callback) => {

    const sql = `
        SELECT
            ds.schedule_id,
            ds.date,
            ds.start_time,
            ds.end_time,
            ds.max_patients,
            ds.queue_paused,
            c.clinic_name,
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
            ) AS now_serving
        FROM doctor_schedule ds
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        WHERE ds.doctor_id = ?
        AND ds.date = CURDATE()
        ORDER BY ds.start_time ASC
    `;

    db.query(sql, [doctor_id], callback);

};

// =====================================================
// Get a Single Session (with ownership check baked in)
// -----------------------------------------------------
// Only returns a row if this schedule_id actually belongs
// to this doctor_id -- used to validate the ?schedule=
// query param before showing/managing its queue.
// =====================================================

exports.getSessionById = (schedule_id, doctor_id, callback) => {

    const sql = `
        SELECT
            ds.schedule_id, ds.date, ds.start_time, ds.end_time,
            ds.max_patients, ds.queue_paused, ds.doctor_id,
            c.clinic_name
        FROM doctor_schedule ds
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        WHERE ds.schedule_id = ?
        AND ds.doctor_id = ?
    `;

    db.query(sql, [schedule_id, doctor_id], callback);

};

// =====================================================
// Get the Full Queue for One Session
// -----------------------------------------------------
// Excludes Cancelled appointments (a patient who cancelled
// isn't part of the doctor's working queue at all).
// =====================================================

exports.getQueueForSession = (schedule_id, callback) => {

    const sql = `
        SELECT
            a.appointment_id,
            a.status AS appointment_status,
            p.patient_id,
            u.full_name AS patient_name,
            u.phone AS patient_phone,
            q.queue_id,
            q.queue_number,
            q.queue_position,
            q.queue_status,
            q.priority_type,
            q.estimated_wait_time,
            q.called_time
        FROM appointments a
        INNER JOIN patients p ON a.patient_id = p.patient_id
        INNER JOIN users u ON p.user_id = u.user_id
        LEFT JOIN queues q ON q.appointment_id = a.appointment_id
        WHERE a.schedule_id = ?
        AND a.status != 'Cancelled'
        ORDER BY
            CASE WHEN q.queue_position IS NULL THEN 1 ELSE 0 END,
            q.queue_position ASC
    `;

    db.query(sql, [schedule_id], callback);

};

// =====================================================
// Get the Next Waiting Patient for a Session
// -----------------------------------------------------
// Lowest queue_position among 'Waiting' entries — this is
// who "Call Next Patient" will call.
// =====================================================

exports.getNextWaiting = (schedule_id, callback) => {

    const sql = `
        SELECT q.queue_id, q.queue_number, a.appointment_id
        FROM queues q
        INNER JOIN appointments a ON q.appointment_id = a.appointment_id
        WHERE a.schedule_id = ?
        AND q.queue_status = 'Waiting'
        ORDER BY q.queue_position ASC
        LIMIT 1
    `;

    db.query(sql, [schedule_id], callback);

};

// =====================================================
// Check If Someone Is Already Being Served in a Session
// -----------------------------------------------------
// "Call Next" is blocked while this returns a row — the
// doctor must Complete or Skip the current patient first.
// =====================================================

exports.getCurrentServing = (schedule_id, callback) => {

    const sql = `
        SELECT q.queue_id, q.queue_number, a.appointment_id
        FROM queues q
        INNER JOIN appointments a ON q.appointment_id = a.appointment_id
        WHERE a.schedule_id = ?
        AND q.queue_status = 'Serving'
        LIMIT 1
    `;

    db.query(sql, [schedule_id], callback);

};

// =====================================================
// Mark a Queue Entry as Serving (Call Next Patient)
// -----------------------------------------------------
// The UPDATE...JOIN chain (queues -> appointments ->
// doctor_schedule) doubles as an ownership check: the row
// only updates if this queue_id truly belongs to a
// schedule owned by doctor_id, so a doctor can never call/
// complete/skip an entry from someone else's session even
// by guessing an ID in a request.
// =====================================================

exports.markServing = (queue_id, doctor_id, callback) => {

    const sql = `
        UPDATE queues q
        INNER JOIN appointments a ON q.appointment_id = a.appointment_id
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        SET q.queue_status = 'Serving', q.called_time = NOW()
        WHERE q.queue_id = ?
        AND ds.doctor_id = ?
    `;

    db.query(sql, [queue_id, doctor_id], callback);

};

// =====================================================
// Mark a Queue Entry (and its Appointment) as Completed
// =====================================================

exports.markCompleted = (queue_id, doctor_id, callback) => {

    const sql = `
        UPDATE queues q
        INNER JOIN appointments a ON q.appointment_id = a.appointment_id
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        SET q.queue_status = 'Completed', a.status = 'Completed'
        WHERE q.queue_id = ?
        AND ds.doctor_id = ?
    `;

    db.query(sql, [queue_id, doctor_id], callback);

};

// =====================================================
// Mark a Queue Entry as Skipped
// =====================================================

exports.markSkipped = (queue_id, doctor_id, callback) => {

    const sql = `
        UPDATE queues q
        INNER JOIN appointments a ON q.appointment_id = a.appointment_id
        INNER JOIN doctor_schedule ds ON a.schedule_id = ds.schedule_id
        SET q.queue_status = 'Skipped'
        WHERE q.queue_id = ?
        AND ds.doctor_id = ?
    `;

    db.query(sql, [queue_id, doctor_id], callback);

};

// =====================================================
// Pause / Resume a Session's Queue
// -----------------------------------------------------
// Requires: ALTER TABLE doctor_schedule
//           ADD COLUMN queue_paused ENUM('Yes','No')
//           NOT NULL DEFAULT 'No';
// (see the README for the exact statement to run)
// =====================================================

exports.setQueuePaused = (schedule_id, doctor_id, pausedValue, callback) => {

    const sql = `
        UPDATE doctor_schedule
        SET queue_paused = ?
        WHERE schedule_id = ?
        AND doctor_id = ?
    `;

    db.query(sql, [pausedValue, schedule_id, doctor_id], callback);

};
