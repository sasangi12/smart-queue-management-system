const db = require("../config/db");

// Average minutes assumed per patient consultation,
// used only to show the patient a rough estimated wait.
const AVG_MINUTES_PER_PATIENT = 10;

// =====================================================
// Count Existing Queue Entries for a Schedule
// =====================================================

exports.countQueueForSchedule = (schedule_id, callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM queues q
        INNER JOIN appointments a ON q.appointment_id = a.appointment_id
        WHERE a.schedule_id = ?
        AND q.queue_status != 'Skipped'
        AND a.status != 'Cancelled'
    `;

    db.query(sql, [schedule_id], callback);

};

// =====================================================
// Create Queue Entry
// =====================================================

exports.createQueueEntry = (appointment_id, position, priority_type, callback) => {

    const queue_number = "Q-" + String(position).padStart(3, "0");
    const estimated_wait_time = position * AVG_MINUTES_PER_PATIENT;

    const sql = `
        INSERT INTO queues
        (appointment_id, queue_number, queue_position, estimated_wait_time, priority_type, queue_status)
        VALUES (?, ?, ?, ?, ?, 'Waiting')
    `;

    db.query(
        sql,
        [appointment_id, queue_number, position, estimated_wait_time, priority_type],
        callback
    );

};

// =====================================================
// Cancel Queue Entry
// =====================================================

exports.cancelQueueEntry = (appointment_id, callback) => {

    const sql = `
        UPDATE queues
        SET queue_status = 'Skipped'
        WHERE appointment_id = ?
    `;

    db.query(sql, [appointment_id], callback);

};

// =====================================================
// Get Live Queue Status for a Patient
// -----------------------------------------------------
// Returns every ACTIVE queue entry (today or later, not
// Cancelled/Skipped/Completed) belonging to this patient,
// with two numbers computed fresh on every call rather
// than trusted from the row that was written at booking
// time:
//
//   - people_ahead : how many OTHER patients in the same
//     doctor_schedule are still Waiting with a smaller
//     queue_position than this patient. This shrinks over
//     time as the doctor module (built later) marks people
//     ahead as Completed/Skipped -- so the number the
//     patient sees is always current, not frozen at the
//     value from when they booked.
//
//   - now_serving : the queue_number currently marked
//     'Serving' for that schedule, if any. Until the
//     Doctor module exists to set that status, this will
//     just come back null, which the view shows as
//     "Not started yet".
// =====================================================

exports.getQueueStatusByPatient = (patient_id, callback) => {

    const sql = `
        SELECT
            q.queue_id,
            q.queue_number,
            q.queue_position,
            q.estimated_wait_time,
            q.queue_status,
            q.priority_type,
            q.called_time,
            ap.appointment_id,
            ap.appointment_date,
            ap.status AS appointment_status,
            ds.schedule_id,
            ds.start_time,
            ds.end_time,
            c.clinic_name,
            u.full_name AS doctor_name,
            d.specialization,
            d.room_no,
            (
                SELECT COUNT(*)
                FROM queues q2
                INNER JOIN appointments a2 ON q2.appointment_id = a2.appointment_id
                WHERE a2.schedule_id = ds.schedule_id
                AND q2.queue_status = 'Waiting'
                AND q2.queue_position < q.queue_position
            ) AS people_ahead,
            (
                SELECT q3.queue_number
                FROM queues q3
                INNER JOIN appointments a3 ON q3.appointment_id = a3.appointment_id
                WHERE a3.schedule_id = ds.schedule_id
                AND q3.queue_status = 'Serving'
                LIMIT 1
            ) AS now_serving
        FROM queues q
        INNER JOIN appointments ap ON q.appointment_id = ap.appointment_id
        INNER JOIN doctor_schedule ds ON ap.schedule_id = ds.schedule_id
        INNER JOIN clinics c ON ds.clinic_id = c.clinic_id
        INNER JOIN doctors d ON ds.doctor_id = d.doctor_id
        INNER JOIN users u ON d.user_id = u.user_id
        WHERE ap.patient_id = ?
        AND ap.status != 'Cancelled'
        AND q.queue_status IN ('Waiting', 'Serving')
        AND ds.date >= CURDATE()
        ORDER BY ds.date ASC, ds.start_time ASC
    `;

    db.query(sql, [patient_id], callback);

};
