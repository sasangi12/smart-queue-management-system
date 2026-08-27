const db = require("../config/db");

// =====================================================
// CREATE NOTIFICATION
// =====================================================

exports.createNotification = (user_id, title, message, notification_type = "General", callback) => {

    const sql = `
        INSERT INTO notifications
            (user_id, title, message, notification_type, is_read)
        VALUES
            (?, ?, ?, ?, 'No')
    `;

    db.query(sql, [user_id, title, message, notification_type], callback);

};

// =====================================================
// CREATE THE SAME NOTIFICATION FOR MULTIPLE USERS
// =====================================================

exports.createNotificationsForUsers = (userIds, title, message, notification_type = "General", callback) => {

    const ids = [...new Set((userIds || []).map(Number).filter(Number.isInteger))];

    if (ids.length === 0) {
        return callback(null);
    }

    const values = ids.map((user_id) => [
        user_id,
        title,
        message,
        notification_type,
        "No"
    ]);

    const sql = `
        INSERT INTO notifications
            (user_id, title, message, notification_type, is_read)
        VALUES ?
    `;

    db.query(sql, [values], callback);

};

// =====================================================
// GET NOTIFICATION TARGETS FOR AN APPOINTMENT
// Patient + Doctor + Clinic details are returned together.
// =====================================================

exports.getAppointmentTargets = (appointment_id, callback) => {

    const sql = `
        SELECT
            a.appointment_id,
            a.appointment_date,
            a.status AS appointment_status,
            p_user.user_id AS patient_user_id,
            p_user.full_name AS patient_name,
            d_user.user_id AS doctor_user_id,
            d_user.full_name AS doctor_name,
            c.clinic_name,
            ds.date AS schedule_date,
            ds.start_time,
            ds.end_time,
            q.queue_number,
            q.queue_position,
            q.estimated_wait_time
        FROM appointments a
        INNER JOIN patients p
            ON a.patient_id = p.patient_id
        INNER JOIN users p_user
            ON p.user_id = p_user.user_id
        INNER JOIN doctor_schedule ds
            ON a.schedule_id = ds.schedule_id
        INNER JOIN doctors d
            ON ds.doctor_id = d.doctor_id
        INNER JOIN users d_user
            ON d.user_id = d_user.user_id
        INNER JOIN clinics c
            ON ds.clinic_id = c.clinic_id
        LEFT JOIN queues q
            ON q.appointment_id = a.appointment_id
        WHERE a.appointment_id = ?
        LIMIT 1
    `;

    db.query(sql, [appointment_id], callback);

};

// =====================================================
// GET ACTIVE ADMIN + RECEPTIONIST USERS
// =====================================================

exports.getActiveStaffUserIds = (callback) => {

    const sql = `
        SELECT u.user_id
        FROM users u
        WHERE u.role_id IN (1, 8)
        AND u.status = 'Active'
    `;

    db.query(sql, [], callback);

};

// =====================================================
// GET PATIENT USER ID FROM A QUEUE ENTRY
// =====================================================

exports.getQueuePatientTarget = (queue_id, callback) => {

    const sql = `
        SELECT
            q.queue_id,
            q.queue_number,
            q.queue_status,
            q.called_time,
            a.appointment_id,
            p_user.user_id AS patient_user_id,
            p_user.full_name AS patient_name,
            d_user.full_name AS doctor_name,
            c.clinic_name,
            ds.date AS schedule_date,
            ds.start_time,
            ds.end_time
        FROM queues q
        INNER JOIN appointments a
            ON q.appointment_id = a.appointment_id
        INNER JOIN patients p
            ON a.patient_id = p.patient_id
        INNER JOIN users p_user
            ON p.user_id = p_user.user_id
        INNER JOIN doctor_schedule ds
            ON a.schedule_id = ds.schedule_id
        INNER JOIN doctors d
            ON ds.doctor_id = d.doctor_id
        INNER JOIN users d_user
            ON d.user_id = d_user.user_id
        INNER JOIN clinics c
            ON ds.clinic_id = c.clinic_id
        WHERE q.queue_id = ?
        LIMIT 1
    `;

    db.query(sql, [queue_id], callback);

};

// =====================================================
// GET ALL NOTIFICATIONS FOR A USER (NEWEST FIRST)
// =====================================================

exports.getNotificationsByUser = (user_id, callback) => {

    const sql = `
        SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY sent_date DESC
    `;

    db.query(sql, [user_id], callback);

};

// =====================================================
// COUNT UNREAD NOTIFICATIONS
// =====================================================

exports.countUnread = (user_id, callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM notifications
        WHERE user_id = ?
        AND is_read = 'No'
    `;

    db.query(sql, [user_id], callback);

};

// =====================================================
// MARK A SINGLE NOTIFICATION AS READ
// =====================================================

exports.markAsRead = (notification_id, user_id, callback) => {

    const sql = `
        UPDATE notifications
        SET is_read = 'Yes'
        WHERE notification_id = ?
        AND user_id = ?
    `;

    db.query(sql, [notification_id, user_id], callback);

};

// =====================================================
// MARK ALL NOTIFICATIONS AS READ
// =====================================================

exports.markAllAsRead = (user_id, callback) => {

    const sql = `
        UPDATE notifications
        SET is_read = 'Yes'
        WHERE user_id = ?
        AND is_read = 'No'
    `;

    db.query(sql, [user_id], callback);

};

// =====================================================
// DELETE A NOTIFICATION
// =====================================================

exports.deleteNotification = (notification_id, user_id, callback) => {

    const sql = `
        DELETE FROM notifications
        WHERE notification_id = ?
        AND user_id = ?
    `;

    db.query(sql, [notification_id, user_id], callback);

};

// =====================================================
// DASHBOARD: GET MOST RECENT NOTIFICATIONS
// =====================================================

exports.getRecentNotifications = (user_id, limit, callback) => {

    const sql = `
        SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY sent_date DESC
        LIMIT ?
    `;

    db.query(sql, [user_id, Number(limit)], callback);

};
