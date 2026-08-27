const express = require("express");
const router = express.Router();

const receptionistController = require("../controllers/receptionistController");
const authMiddleware = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const notificationModel = require("../models/notificationModel");

// Every route in this file is a receptionist-only, logged-in-only route.
router.use(authMiddleware.isLoggedIn, authMiddleware.isReceptionist);

// =====================================================
// Unread Notification Count (runs before EVERY /receptionist page)
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

router.get("/dashboard", receptionistController.getDashboard);

// =====================================================
// Register Patient
// =====================================================

router.get("/registerPatient", receptionistController.getRegisterPatient);
router.post("/registerPatient", receptionistController.postRegisterPatient);

// =====================================================
// Appointments (hospital-wide list + book on a patient's
// behalf)
// =====================================================

router.get("/appointments", receptionistController.getAppointments);
router.post("/appointments/book", receptionistController.postBookAppointment);
router.post("/appointments/cancel/:appointment_id", receptionistController.postCancelAppointment);

// AJAX endpoints used by the booking form
router.get("/getSchedulesByClinic/:clinic_id", receptionistController.getSchedulesByClinic);
router.get("/searchPatients", receptionistController.searchPatientsAjax);

// =====================================================
// Queue Overview (read-only, hospital-wide)
// =====================================================

router.get("/queue", receptionistController.getQueueOverview);

// =====================================================
// Profile
// =====================================================

router.get("/profile", receptionistController.getProfile);
router.post("/profile/update", receptionistController.postUpdateProfile);
router.post("/profile/changePassword", receptionistController.postChangePassword);
router.post("/profile/uploadImage", uploadMiddleware.uploadProfileImage, receptionistController.postUploadProfileImage);
router.post("/profile/deleteImage", receptionistController.postDeleteProfileImage);

// =====================================================
// Notifications
// =====================================================

router.get("/notifications", receptionistController.getNotifications);
router.post("/notifications/markRead/:notification_id", receptionistController.postMarkNotificationRead);
router.post("/notifications/markAllRead", receptionistController.postMarkAllNotificationsRead);
router.post("/notifications/delete/:notification_id", receptionistController.postDeleteNotification);

module.exports = router;