const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const notificationModel = require("../models/notificationModel");

// Every route in this file is an admin-only, logged-in-only route.
router.use(authMiddleware.isLoggedIn, authMiddleware.isAdmin);

// =====================================================
// Unread Notification Count (runs before EVERY /admin page)
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

router.get("/dashboard", adminController.getDashboard);

// =====================================================
// Manage Doctors
// =====================================================

router.get("/manageDoctors", adminController.getManageDoctors);
router.post("/manageDoctors/add", adminController.postAddDoctor);
router.get("/manageDoctors/edit/:doctor_id", adminController.getEditDoctor);
router.post("/manageDoctors/edit/:doctor_id", adminController.postEditDoctor);
router.post("/manageDoctors/toggleStatus/:doctor_id", adminController.postToggleDoctorStatus);

// =====================================================
// Manage Clinics
// =====================================================

router.get("/manageClinics", adminController.getManageClinics);
router.post("/manageClinics/add", adminController.postAddClinic);
router.get("/manageClinics/edit/:clinic_id", adminController.getEditClinic);
router.post("/manageClinics/edit/:clinic_id", adminController.postEditClinic);
router.post("/manageClinics/toggleStatus/:clinic_id", adminController.postToggleClinicStatus);

// =====================================================
// Manage Patients
// =====================================================

router.get("/managePatients", adminController.getManagePatients);
router.get("/managePatients/:patient_id", adminController.getPatientDetail);
router.post("/managePatients/toggleStatus/:patient_id", adminController.postTogglePatientStatus);

// =====================================================
// Manage Receptionists
// =====================================================

router.get("/manageReceptionists", adminController.getManageReceptionists);
router.post("/manageReceptionists/add", adminController.postAddReceptionist);
router.get("/manageReceptionists/edit/:user_id", adminController.getEditReceptionist);
router.post("/manageReceptionists/edit/:user_id", adminController.postEditReceptionist);
router.post("/manageReceptionists/toggleStatus/:user_id", adminController.postToggleReceptionistStatus);

// =====================================================
// Reports
// =====================================================

router.get("/reports", adminController.getReports);

// =====================================================
// Profile
// =====================================================

router.get("/profile", adminController.getProfile);
router.post("/profile/update", adminController.postUpdateProfile);
router.post("/profile/changePassword", adminController.postChangePassword);
router.post("/profile/uploadImage", uploadMiddleware.uploadProfileImage, adminController.postUploadProfileImage);
router.post("/profile/deleteImage", adminController.postDeleteProfileImage);

// =====================================================
// Notifications
// =====================================================

router.get("/notifications", adminController.getNotifications);
router.post("/notifications/markRead/:notification_id", adminController.postMarkNotificationRead);
router.post("/notifications/markAllRead", adminController.postMarkAllNotificationsRead);
router.post("/notifications/delete/:notification_id", adminController.postDeleteNotification);

module.exports = router;