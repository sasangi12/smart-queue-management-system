const express = require("express");
const router = express.Router();

const doctorController = require("../controllers/doctorController");
const authMiddleware = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const notificationModel = require("../models/notificationModel");

// Every route in this file is a doctor-only, logged-in-only route.
router.use(authMiddleware.isLoggedIn, authMiddleware.isDoctor);

// =====================================================
// Unread Notification Count (runs before EVERY /doctor page)
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

router.get("/dashboard", doctorController.getDashboard);

// =====================================================
// Today's Appointments
// =====================================================

router.get("/appointments", doctorController.getAppointments);

// =====================================================
// Manage Queue
// =====================================================

router.get("/queue", doctorController.getManageQueue);
router.post("/queue/callNext", doctorController.postCallNext);
router.post("/queue/complete/:queue_id", doctorController.postMarkCompleted);
router.post("/queue/skip/:queue_id", doctorController.postSkipPatient);
router.post("/queue/pause", doctorController.postPauseQueue);
router.post("/queue/resume", doctorController.postResumeQueue);

// =====================================================
// Patient History (list route BEFORE the /:patient_id route)
// =====================================================

router.get("/patientHistory", doctorController.getPatientHistoryList);
router.get("/patientHistory/:patient_id", doctorController.getPatientHistoryDetail);

// =====================================================
// Notifications
// =====================================================

router.get("/notifications", doctorController.getNotifications);
router.post("/notifications/markRead/:notification_id", doctorController.postMarkNotificationRead);
router.post("/notifications/markAllRead", doctorController.postMarkAllNotificationsRead);
router.post("/notifications/delete/:notification_id", doctorController.postDeleteNotification);

// =====================================================
// Profile
// =====================================================

router.get("/profile", doctorController.getProfile);
router.post("/profile/update", doctorController.postUpdateProfile);
router.post("/profile/changePassword", doctorController.postChangePassword);
router.post("/profile/uploadImage", uploadMiddleware.uploadProfileImage, doctorController.postUploadProfileImage);
router.post("/profile/deleteImage", doctorController.postDeleteProfileImage);

module.exports = router;
