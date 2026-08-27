const express = require("express");
const router = express.Router();

const patientController = require("../controllers/patientController");
const authMiddleware = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const notificationModel = require("../models/notificationModel");

// Every route in this file is a patient-only, logged-in-only route,
// so apply both middlewares once here instead of on each route.
router.use(authMiddleware.isLoggedIn, authMiddleware.isPatient);

// =====================================================
// Unread Notification Count (runs before EVERY /patient
// page so the navbar bell badge is always accurate)
// =====================================================

router.use((req, res, next) => {

    const user_id = req.session.user.user_id;

    notificationModel.countUnread(user_id, (err, result) => {

        res.locals.unreadNotifications = (!err && result.length > 0) ? result[0].total : 0;

        next();

    });

});

// =====================================================
// Dashboard
// =====================================================

router.get("/dashboard", patientController.getDashboard);

// =====================================================
// Book Appointment
// =====================================================

router.get("/bookAppointment", patientController.getBookAppointment);
router.post("/bookAppointment", patientController.postBookAppointment);

router.get("/getSchedulesByClinic/:clinic_id", patientController.getSchedulesByClinic);

// =====================================================
// My Appointments
// =====================================================

router.get("/appointments", patientController.getAppointments);
router.post("/appointments/cancel/:appointment_id", patientController.postCancelAppointment);

// =====================================================
// Queue Status
// =====================================================

router.get("/queue", patientController.getQueueStatus);
router.get("/getQueueStatus", patientController.getQueueStatusJson);

// =====================================================
// Notifications
// =====================================================

router.get("/notifications", patientController.getNotifications);
router.post("/notifications/markRead/:notification_id", patientController.postMarkNotificationRead);
router.post("/notifications/markAllRead", patientController.postMarkAllNotificationsRead);
router.post("/notifications/delete/:notification_id", patientController.postDeleteNotification);

// =====================================================
// Profile
// =====================================================

router.get("/profile", patientController.getProfile);
router.post("/profile/update", patientController.postUpdateProfile);
router.post("/profile/changePassword", patientController.postChangePassword);

// Profile photo (multer middleware runs first, then the controller)
router.post("/profile/uploadImage", uploadMiddleware.uploadProfileImage, patientController.postUploadProfileImage);
router.post("/profile/deleteImage", patientController.postDeleteProfileImage);

module.exports = router;
