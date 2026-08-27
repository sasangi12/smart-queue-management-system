const bcrypt = require("bcrypt");

const adminModel = require("../models/adminModel");
const adminDoctorModel = require("../models/adminDoctorModel");
const adminClinicModel = require("../models/adminClinicModel");
const adminPatientModel = require("../models/adminPatientModel");
const adminReceptionistModel = require("../models/adminReceptionistModel");
const adminReportModel = require("../models/adminReportModel");

const fs = require("fs");
const path = require("path");

const notificationModel = require("../models/notificationModel");

const userModel = require("../models/userModel");
const profileModel = require("../models/profileModel");
const doctorModel = require("../models/doctorModel");


// =====================================================
// Small date helpers (same pattern used in
// doctorController.js / receptionistController.js)
// =====================================================

function getTodayDateString() {

    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;

}

function shiftDateString(dateString, days) {

    const d = new Date(dateString + "T00:00:00");
    d.setDate(d.getDate() + days);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;

}

// =====================================================
// ADMIN DASHBOARD
// =====================================================

exports.getDashboard = (req, res) => {

    const user_id = req.session.user.user_id;

    const stats = {
        totalPatients: 0,
        totalDoctors: 0,
        totalReceptionists: 0,
        todayAppointments: 0,
        totalClinics: 0
    };

    let recentRegistrations = [];
    let clinicActivity = [];
    let recentNotifications = [];

    let pending = 8;

    function checkDone() {

        pending--;

        if (pending === 0) {

            res.render("admin/dashboard", {
                currentPage: "dashboard",
                stats: stats,
                recentRegistrations: recentRegistrations,
                clinicActivity: clinicActivity,
                recentNotifications: recentNotifications
            });

        }

    }

    adminModel.countTotalPatients((err, result) => {

        if (!err && result.length > 0) {
            stats.totalPatients = result[0].total;
        }

        checkDone();

    });

    adminModel.countTotalDoctors((err, result) => {

        if (!err && result.length > 0) {
            stats.totalDoctors = result[0].total;
        }

        checkDone();

    });

    adminModel.countTotalReceptionists((err, result) => {

        if (!err && result.length > 0) {
            stats.totalReceptionists = result[0].total;
        }

        checkDone();

    });

    adminModel.countTodayAppointments((err, result) => {

        if (!err && result.length > 0) {
            stats.todayAppointments = result[0].total;
        }

        checkDone();

    });

    adminModel.countTotalClinics((err, result) => {

        if (!err && result.length > 0) {
            stats.totalClinics = result[0].total;
        }

        checkDone();

    });

    adminModel.getRecentRegistrations(6, (err, result) => {

        if (!err) {
            recentRegistrations = result;
        }

        checkDone();

    });

    adminModel.getClinicActivityToday((err, result) => {

        if (!err) {
            clinicActivity = result;
        }

        checkDone();

    });

    notificationModel.getRecentNotifications(user_id, 3, (err, result) => {

        if (!err) {
            recentNotifications = result;
        }

        checkDone();

    });

};

// =====================================================
// MANAGE DOCTORS -- LIST (+ inline Add Doctor form)
// =====================================================

exports.getManageDoctors = (req, res) => {

    const searchTerm = typeof req.query.search === "string" ? req.query.search.trim() : "";

    adminDoctorModel.getAllDoctors(searchTerm, (err, doctors) => {

        if (err) {
            console.log(err);
            doctors = [];
        }

        let successMsg = null;
        let errorMsg = null;

        if (req.query.added === "1") successMsg = "Doctor account created successfully.";
        if (req.query.updated === "1") successMsg = "Doctor updated successfully.";
        if (req.query.statusUpdated === "1") successMsg = "Doctor status updated.";

        if (req.query.error === "email") errorMsg = "That email address is already registered.";
        if (req.query.error === "password") errorMsg = "Password must be at least 6 characters.";
        if (req.query.error === "mismatch") errorMsg = "Password and confirmation do not match.";
        if (req.query.error === "fields") errorMsg = "Please fill in all required fields.";
        if (req.query.error === "email_format") errorMsg = "Please enter a valid email address.";
        if (req.query.error === "1") errorMsg = "Something went wrong. Please try again.";

        res.render("admin/manageDoctors", {
            currentPage: "manageDoctors",
            doctors: doctors,
            searchTerm: searchTerm,
            successMsg: successMsg,
            errorMsg: errorMsg
        });

    });

};

// =====================================================
// MANAGE DOCTORS -- ADD NEW DOCTOR
// =====================================================

exports.postAddDoctor = (req, res) => {

    const {
        full_name,
        email,
        phone,
        specialization,
        qualification,
        room_no,
        password,
        confirmPassword
    } = req.body;

    if (!full_name || !email || !phone || !password || !confirmPassword) {

        return res.redirect("/admin/manageDoctors?error=fields");

    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        return res.redirect("/admin/manageDoctors?error=email_format");

    }

    if (password.length < 6) {

        return res.redirect("/admin/manageDoctors?error=password");

    }

    if (password !== confirmPassword) {

        return res.redirect("/admin/manageDoctors?error=mismatch");

    }

    userModel.findUserByEmail(email, (err, emailResult) => {

        if (err) {

            console.log(err);

            return res.redirect("/admin/manageDoctors?error=1");

        }

        if (emailResult.length > 0) {

            return res.redirect("/admin/manageDoctors?error=email");

        }

        bcrypt.hash(password, 10, (err, hashedPassword) => {

            if (err) {

                console.log(err);

                return res.redirect("/admin/manageDoctors?error=1");

            }

            const role_id = 2; // Doctor

            const userData = [role_id, full_name, email, phone, hashedPassword];

            userModel.createUser(userData, (err, userResult) => {

                if (err) {

                    console.log(err);

                    return res.redirect("/admin/manageDoctors?error=1");

                }

                const user_id = userResult.insertId;

                adminDoctorModel.createDoctorRecord(
                    user_id,
                    {
                        specialization: specialization || null,
                        qualification: qualification || null,
                        room_no: room_no || null
                    },
                    (err) => {

                        if (err) {

                            console.log(err);

                            return res.redirect("/admin/manageDoctors?error=1");

                        }

                        return res.redirect("/admin/manageDoctors?added=1");

                    }
                );

            });

        });

    });

};

// =====================================================
// MANAGE DOCTORS -- EDIT (view)
// =====================================================

exports.getEditDoctor = (req, res) => {

    const doctor_id = req.params.doctor_id;

    adminDoctorModel.getDoctorById(doctor_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.redirect("/admin/manageDoctors?error=1");

        }

        let errorMsg = null;

        if (req.query.error === "email") errorMsg = "That email address is already in use by another account.";
        if (req.query.error === "1") errorMsg = "Unable to update this doctor. Please try again.";

        res.render("admin/editDoctor", {
            currentPage: "manageDoctors",
            doctor: result[0],
            errorMsg: errorMsg
        });

    });

};

// =====================================================
// MANAGE DOCTORS -- EDIT (submit)
// =====================================================

exports.postEditDoctor = (req, res) => {

    const doctor_id = req.params.doctor_id;

    const {
        user_id,
        full_name,
        email,
        phone,
        specialization,
        qualification,
        room_no
    } = req.body;

    if (!full_name || !email || !phone) {

        return res.redirect(`/admin/manageDoctors/edit/${doctor_id}?error=1`);

    }

    profileModel.findEmailUsedByOthers(email, user_id, (err, emailMatches) => {

        if (err) {

            console.log(err);

            return res.redirect(`/admin/manageDoctors/edit/${doctor_id}?error=1`);

        }

        if (emailMatches.length > 0) {

            return res.redirect(`/admin/manageDoctors/edit/${doctor_id}?error=email`);

        }

        profileModel.updateUserInfo(user_id, { full_name, email, phone }, (err) => {

            if (err) {

                console.log(err);

                return res.redirect(`/admin/manageDoctors/edit/${doctor_id}?error=1`);

            }

            doctorModel.updateDoctorInfo(
                doctor_id,
                {
                    specialization: specialization || null,
                    qualification: qualification || null,
                    room_no: room_no || null
                },
                (err) => {

                    if (err) {

                        console.log(err);

                        return res.redirect(`/admin/manageDoctors/edit/${doctor_id}?error=1`);

                    }

                    return res.redirect("/admin/manageDoctors?updated=1");

                }
            );

        });

    });

};

// =====================================================
// MANAGE DOCTORS -- TOGGLE STATUS
// =====================================================

exports.postToggleDoctorStatus = (req, res) => {

    const doctor_id = req.params.doctor_id;

    adminDoctorModel.getDoctorById(doctor_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.redirect("/admin/manageDoctors?error=1");

        }

        const doctor = result[0];
        const newStatus = doctor.status === "Active" ? "Inactive" : "Active";

        adminDoctorModel.setDoctorStatus(doctor.user_id, newStatus, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/admin/manageDoctors?error=1");

            }

            return res.redirect("/admin/manageDoctors?statusUpdated=1");

        });

    });

};

// =====================================================
// MANAGE CLINICS -- LIST (+ inline Add Clinic form)
// =====================================================

exports.getManageClinics = (req, res) => {

    const searchTerm = typeof req.query.search === "string" ? req.query.search.trim() : "";

    adminClinicModel.getAllClinics(searchTerm, (err, clinics) => {

        if (err) {
            console.log(err);
            clinics = [];
        }

        let successMsg = null;
        let errorMsg = null;

        if (req.query.added === "1") successMsg = "Clinic created successfully.";
        if (req.query.updated === "1") successMsg = "Clinic updated successfully.";
        if (req.query.statusUpdated === "1") successMsg = "Clinic status updated.";

        if (req.query.error === "name") errorMsg = "A clinic with that name already exists.";
        if (req.query.error === "fields") errorMsg = "Please enter a clinic name.";
        if (req.query.error === "1") errorMsg = "Something went wrong. Please try again.";

        res.render("admin/manageClinics", {
            currentPage: "manageClinics",
            clinics: clinics,
            searchTerm: searchTerm,
            successMsg: successMsg,
            errorMsg: errorMsg
        });

    });

};

// =====================================================
// MANAGE CLINICS -- ADD NEW CLINIC
// =====================================================

exports.postAddClinic = (req, res) => {

    const { clinic_name, description } = req.body;

    if (!clinic_name) {

        return res.redirect("/admin/manageClinics?error=fields");

    }

    adminClinicModel.findClinicNameUsedByOthers(clinic_name, 0, (err, matches) => {

        if (err) {

            console.log(err);

            return res.redirect("/admin/manageClinics?error=1");

        }

        if (matches.length > 0) {

            return res.redirect("/admin/manageClinics?error=name");

        }

        adminClinicModel.createClinic({ clinic_name, description }, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/admin/manageClinics?error=1");

            }

            return res.redirect("/admin/manageClinics?added=1");

        });

    });

};

// =====================================================
// MANAGE CLINICS -- EDIT (view)
// =====================================================

exports.getEditClinic = (req, res) => {

    const clinic_id = req.params.clinic_id;

    adminClinicModel.getClinicById(clinic_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.redirect("/admin/manageClinics?error=1");

        }

        const clinic = result[0];

        adminClinicModel.countUpcomingSchedules(clinic_id, (err, countResult) => {

            const upcomingSchedules = (!err && countResult.length > 0) ? countResult[0].total : 0;

            let errorMsg = null;

            if (req.query.error === "name") errorMsg = "A clinic with that name already exists.";
            if (req.query.error === "1") errorMsg = "Unable to update this clinic. Please try again.";

            res.render("admin/editClinic", {
                currentPage: "manageClinics",
                clinic: clinic,
                upcomingSchedules: upcomingSchedules,
                errorMsg: errorMsg
            });

        });

    });

};

// =====================================================
// MANAGE CLINICS -- EDIT (submit)
// =====================================================

exports.postEditClinic = (req, res) => {

    const clinic_id = req.params.clinic_id;
    const { clinic_name, description } = req.body;

    if (!clinic_name) {

        return res.redirect(`/admin/manageClinics/edit/${clinic_id}?error=1`);

    }

    adminClinicModel.findClinicNameUsedByOthers(clinic_name, clinic_id, (err, matches) => {

        if (err) {

            console.log(err);

            return res.redirect(`/admin/manageClinics/edit/${clinic_id}?error=1`);

        }

        if (matches.length > 0) {

            return res.redirect(`/admin/manageClinics/edit/${clinic_id}?error=name`);

        }

        adminClinicModel.updateClinic(clinic_id, { clinic_name, description }, (err) => {

            if (err) {

                console.log(err);

                return res.redirect(`/admin/manageClinics/edit/${clinic_id}?error=1`);

            }

            return res.redirect("/admin/manageClinics?updated=1");

        });

    });

};

// =====================================================
// MANAGE CLINICS -- TOGGLE STATUS
// =====================================================

exports.postToggleClinicStatus = (req, res) => {

    const clinic_id = req.params.clinic_id;

    adminClinicModel.getClinicById(clinic_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.redirect("/admin/manageClinics?error=1");

        }

        const clinic = result[0];
        const newStatus = clinic.status === "Active" ? "Inactive" : "Active";

        adminClinicModel.setClinicStatus(clinic_id, newStatus, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/admin/manageClinics?error=1");

            }

            return res.redirect("/admin/manageClinics?statusUpdated=1");

        });

    });

};

// =====================================================
// MANAGE PATIENTS -- LIST
// -----------------------------------------------------
// No "Add Patient" here, deliberately -- patients either
// self-register or are registered by a Receptionist
// (Register Patient page). An admin's role here is
// oversight (search, view full history, activate/
// deactivate), not data entry.
// =====================================================

exports.getManagePatients = (req, res) => {

    const searchTerm = typeof req.query.search === "string" ? req.query.search.trim() : "";

    adminPatientModel.getAllPatients(searchTerm, (err, patients) => {

        if (err) {
            console.log(err);
            patients = [];
        }

        let successMsg = null;
        let errorMsg = null;

        if (req.query.statusUpdated === "1") successMsg = "Patient status updated.";
        if (req.query.error === "1") errorMsg = "Something went wrong. Please try again.";

        res.render("admin/managePatients", {
            currentPage: "managePatients",
            patients: patients,
            searchTerm: searchTerm,
            successMsg: successMsg,
            errorMsg: errorMsg
        });

    });

};

// =====================================================
// MANAGE PATIENTS -- DETAIL (full visit history, every doctor)
// =====================================================

exports.getPatientDetail = (req, res) => {

    const patient_id = req.params.patient_id;

    adminPatientModel.getPatientById(patient_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.redirect("/admin/managePatients?error=1");

        }

        const patient = result[0];

        adminPatientModel.getPatientVisitHistory(patient_id, (err, history) => {

            if (err) {
                console.log(err);
                history = [];
            }

            const completedCount = history.filter((h) => h.appointment_status === "Completed").length;
            const cancelledCount = history.filter((h) => h.appointment_status === "Cancelled").length;

            res.render("admin/patientDetail", {
                currentPage: "managePatients",
                patient: patient,
                history: history,
                stats: {
                    totalVisits: history.length,
                    completedCount: completedCount,
                    cancelledCount: cancelledCount
                }
            });

        });

    });

};

// =====================================================
// MANAGE PATIENTS -- TOGGLE STATUS
// =====================================================

exports.postTogglePatientStatus = (req, res) => {

    const patient_id = req.params.patient_id;

    adminPatientModel.getPatientById(patient_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.redirect("/admin/managePatients?error=1");

        }

        const patient = result[0];
        const newStatus = patient.status === "Active" ? "Inactive" : "Active";

        adminPatientModel.setPatientStatus(patient.user_id, newStatus, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/admin/managePatients?error=1");

            }

            return res.redirect("/admin/managePatients?statusUpdated=1");

        });

    });

};

// =====================================================
// MANAGE RECEPTIONISTS -- LIST (+ inline Add form)
// =====================================================

exports.getManageReceptionists = (req, res) => {

    const searchTerm = typeof req.query.search === "string" ? req.query.search.trim() : "";

    adminReceptionistModel.getAllReceptionists(searchTerm, (err, receptionists) => {

        if (err) {
            console.log(err);
            receptionists = [];
        }

        let successMsg = null;
        let errorMsg = null;

        if (req.query.added === "1") successMsg = "Receptionist account created successfully.";
        if (req.query.updated === "1") successMsg = "Receptionist updated successfully.";
        if (req.query.statusUpdated === "1") successMsg = "Receptionist status updated.";

        if (req.query.error === "email") errorMsg = "That email address is already registered.";
        if (req.query.error === "password") errorMsg = "Password must be at least 6 characters.";
        if (req.query.error === "mismatch") errorMsg = "Password and confirmation do not match.";
        if (req.query.error === "fields") errorMsg = "Please fill in all required fields.";
        if (req.query.error === "email_format") errorMsg = "Please enter a valid email address.";
        if (req.query.error === "1") errorMsg = "Something went wrong. Please try again.";

        res.render("admin/manageReceptionists", {
            currentPage: "manageReceptionists",
            receptionists: receptionists,
            searchTerm: searchTerm,
            successMsg: successMsg,
            errorMsg: errorMsg
        });

    });

};

// =====================================================
// MANAGE RECEPTIONISTS -- ADD NEW
// =====================================================

exports.postAddReceptionist = (req, res) => {

    const { full_name, email, phone, password, confirmPassword } = req.body;

    if (!full_name || !email || !phone || !password || !confirmPassword) {

        return res.redirect("/admin/manageReceptionists?error=fields");

    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        return res.redirect("/admin/manageReceptionists?error=email_format");

    }

    if (password.length < 6) {

        return res.redirect("/admin/manageReceptionists?error=password");

    }

    if (password !== confirmPassword) {

        return res.redirect("/admin/manageReceptionists?error=mismatch");

    }

    userModel.findUserByEmail(email, (err, emailResult) => {

        if (err) {

            console.log(err);

            return res.redirect("/admin/manageReceptionists?error=1");

        }

        if (emailResult.length > 0) {

            return res.redirect("/admin/manageReceptionists?error=email");

        }

        adminReceptionistModel.getReceptionistRoleId((err, roleResult) => {

            if (err || roleResult.length === 0) {

                console.log(err);

                return res.redirect("/admin/manageReceptionists?error=1");

            }

            const role_id = roleResult[0].role_id;

            bcrypt.hash(password, 10, (err, hashedPassword) => {

                if (err) {

                    console.log(err);

                    return res.redirect("/admin/manageReceptionists?error=1");

                }

                const userData = [role_id, full_name, email, phone, hashedPassword];

                userModel.createUser(userData, (err) => {

                    if (err) {

                        console.log(err);

                        return res.redirect("/admin/manageReceptionists?error=1");

                    }

                    return res.redirect("/admin/manageReceptionists?added=1");

                });

            });

        });

    });

};

// =====================================================
// MANAGE RECEPTIONISTS -- EDIT (view)
// =====================================================

exports.getEditReceptionist = (req, res) => {

    const user_id = req.params.user_id;

    adminReceptionistModel.getReceptionistById(user_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.redirect("/admin/manageReceptionists?error=1");

        }

        let errorMsg = null;

        if (req.query.error === "email") errorMsg = "That email address is already in use by another account.";
        if (req.query.error === "1") errorMsg = "Unable to update this receptionist. Please try again.";

        res.render("admin/editReceptionist", {
            currentPage: "manageReceptionists",
            receptionist: result[0],
            errorMsg: errorMsg
        });

    });

};

// =====================================================
// MANAGE RECEPTIONISTS -- EDIT (submit)
// -----------------------------------------------------
// Reuses profileModel.updateUserInfo (generic, users-only)
// -- no receptionist-specific update needed since there's
// no second table.
// =====================================================

exports.postEditReceptionist = (req, res) => {

    const user_id = req.params.user_id;
    const { full_name, email, phone } = req.body;

    if (!full_name || !email || !phone) {

        return res.redirect(`/admin/manageReceptionists/edit/${user_id}?error=1`);

    }

    profileModel.findEmailUsedByOthers(email, user_id, (err, emailMatches) => {

        if (err) {

            console.log(err);

            return res.redirect(`/admin/manageReceptionists/edit/${user_id}?error=1`);

        }

        if (emailMatches.length > 0) {

            return res.redirect(`/admin/manageReceptionists/edit/${user_id}?error=email`);

        }

        profileModel.updateUserInfo(user_id, { full_name, email, phone }, (err) => {

            if (err) {

                console.log(err);

                return res.redirect(`/admin/manageReceptionists/edit/${user_id}?error=1`);

            }

            return res.redirect("/admin/manageReceptionists?updated=1");

        });

    });

};

// =====================================================
// MANAGE RECEPTIONISTS -- TOGGLE STATUS
// =====================================================

exports.postToggleReceptionistStatus = (req, res) => {

    const user_id = req.params.user_id;

    adminReceptionistModel.getReceptionistById(user_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.redirect("/admin/manageReceptionists?error=1");

        }

        const receptionist = result[0];
        const newStatus = receptionist.status === "Active" ? "Inactive" : "Active";

        adminReceptionistModel.setReceptionistStatus(user_id, newStatus, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/admin/manageReceptionists?error=1");

            }

            return res.redirect("/admin/manageReceptionists?statusUpdated=1");

        });

    });

};

// =====================================================
// REPORTS -- PAGE
// -----------------------------------------------------
// Defaults to the last 30 days if no ?startDate/?endDate
// query params are given. All 6 data pieces run in
// parallel via a pending-counter, same pattern used
// throughout this project.
// =====================================================

exports.getReports = (req, res) => {

    const todayDateString = getTodayDateString();
    const defaultStartDate = shiftDateString(todayDateString, -29); // last 30 days inclusive

    const requestedStart = req.query.startDate;
    const requestedEnd = req.query.endDate;

    const isValidDate = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

    const startDate = isValidDate(requestedStart) ? requestedStart : defaultStartDate;
    const endDate = isValidDate(requestedEnd) ? requestedEnd : todayDateString;

    const summary = {
        total: 0,
        completed: 0,
        cancelled: 0,
        skipped: 0,
        newPatients: 0,
        avgWait: 0
    };

    let doctorWorkload = [];
    let clinicPerformance = [];

    let pending = 6;

    function checkDone() {

        pending--;

        if (pending === 0) {

            res.render("admin/reports", {
                currentPage: "reports",
                startDate: startDate,
                endDate: endDate,
                todayDateString: todayDateString,
                summary: summary,
                doctorWorkload: doctorWorkload,
                clinicPerformance: clinicPerformance
            });

        }

    }

    adminReportModel.getAppointmentSummary(startDate, endDate, (err, result) => {

        if (!err && result.length > 0) {
            summary.total = result[0].total || 0;
            summary.completed = result[0].completed || 0;
            summary.cancelled = result[0].cancelled || 0;
        }

        checkDone();

    });

    adminReportModel.getSkippedCount(startDate, endDate, (err, result) => {

        if (!err && result.length > 0) {
            summary.skipped = result[0].total || 0;
        }

        checkDone();

    });

    adminReportModel.getNewPatientsCount(startDate, endDate, (err, result) => {

        if (!err && result.length > 0) {
            summary.newPatients = result[0].total || 0;
        }

        checkDone();

    });

    adminReportModel.getAverageWaitTime(startDate, endDate, (err, result) => {

        if (!err && result.length > 0 && result[0].avg_wait !== null) {
            summary.avgWait = Math.round(result[0].avg_wait);
        }

        checkDone();

    });

    adminReportModel.getDoctorWorkload(startDate, endDate, (err, result) => {

        if (!err) {
            doctorWorkload = result;
        }

        checkDone();

    });

    adminReportModel.getClinicPerformance(startDate, endDate, (err, result) => {

        if (!err) {
            clinicPerformance = result;
        }

        checkDone();

    });

};

// =====================================================
// PROFILE -- VIEW
// -----------------------------------------------------
// Admin has NO second table (same as Receptionist) -- 
// profileModel.getUserBasicInfo reads only from `users`,
// reused exactly as-is from the Receptionist module.
// =====================================================

exports.getProfile = (req, res) => {

    const user_id = req.session.user.user_id;

    profileModel.getUserBasicInfo(user_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.render("admin/profile", {
                currentPage: "profile",
                profile: null,
                successMsg: null,
                errorMsg: "Unable to load your profile right now.",
                passwordSuccessMsg: null,
                passwordErrorMsg: null
            });

        }

        let successMsg = null;
        let errorMsg = null;
        let passwordSuccessMsg = null;
        let passwordErrorMsg = null;

        if (req.query.updated === "1") successMsg = "Profile updated successfully.";
        if (req.query.error === "email") errorMsg = "That email is already in use by another account.";
        if (req.query.error === "1") errorMsg = "Unable to update your profile. Please try again.";

        if (req.query.imgUpdated === "1") successMsg = "Profile photo updated successfully.";
        if (req.query.imgDeleted === "1") successMsg = "Profile photo removed.";
        if (req.query.imgError === "1") errorMsg = "Unable to update your profile photo. Please use a JPG, PNG, or WEBP file under 2MB.";

        if (req.query.pwUpdated === "1") passwordSuccessMsg = "Password changed successfully.";
        if (req.query.pwError === "mismatch") passwordErrorMsg = "Current password is incorrect.";
        if (req.query.pwError === "confirm") passwordErrorMsg = "New password and confirmation do not match.";
        if (req.query.pwError === "length") passwordErrorMsg = "New password must be at least 6 characters.";
        if (req.query.pwError === "1") passwordErrorMsg = "Unable to change your password. Please try again.";

        res.render("admin/profile", {
            currentPage: "profile",
            profile: result[0],
            successMsg: successMsg,
            errorMsg: errorMsg,
            passwordSuccessMsg: passwordSuccessMsg,
            passwordErrorMsg: passwordErrorMsg
        });

    });

};

// =====================================================
// PROFILE -- UPDATE (users table only)
// =====================================================

exports.postUpdateProfile = (req, res) => {

    const user_id = req.session.user.user_id;

    const { full_name, email, phone } = req.body;

    if (!full_name || !email || !phone) {

        return res.redirect("/admin/profile?error=1");

    }

    profileModel.findEmailUsedByOthers(email, user_id, (err, emailMatches) => {

        if (err) {

            console.log(err);

            return res.redirect("/admin/profile?error=1");

        }

        if (emailMatches.length > 0) {

            return res.redirect("/admin/profile?error=email");

        }

        profileModel.updateUserInfo(user_id, { full_name, email, phone }, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/admin/profile?error=1");

            }

            req.session.user.full_name = full_name;
            req.session.user.email = email;
            req.session.user.phone = phone;

            return res.redirect("/admin/profile?updated=1");

        });

    });

};

// =====================================================
// PROFILE -- CHANGE PASSWORD
// =====================================================

exports.postChangePassword = (req, res) => {

    const user_id = req.session.user.user_id;

    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {

        return res.redirect("/admin/profile?pwError=1");

    }

    if (newPassword.length < 6) {

        return res.redirect("/admin/profile?pwError=length");

    }

    if (newPassword !== confirmNewPassword) {

        return res.redirect("/admin/profile?pwError=confirm");

    }

    profileModel.getPasswordHash(user_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.redirect("/admin/profile?pwError=1");

        }

        const currentHash = result[0].password;

        bcrypt.compare(currentPassword, currentHash, (err, isMatch) => {

            if (err) {

                console.log(err);

                return res.redirect("/admin/profile?pwError=1");

            }

            if (!isMatch) {

                return res.redirect("/admin/profile?pwError=mismatch");

            }

            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {

                if (err) {

                    console.log(err);

                    return res.redirect("/admin/profile?pwError=1");

                }

                profileModel.updatePassword(user_id, hashedPassword, (err) => {

                    if (err) {

                        console.log(err);

                        return res.redirect("/admin/profile?pwError=1");

                    }

                    return res.redirect("/admin/profile?pwUpdated=1");

                });

            });

        });

    });

};

// =====================================================
// PROFILE -- UPLOAD / REPLACE PHOTO
// =====================================================

exports.postUploadProfileImage = (req, res) => {

    const user_id = req.session.user.user_id;

    if (!req.file) {

        return res.redirect("/admin/profile?imgError=1");

    }

    const newImagePath = "/uploads/profile/" + req.file.filename;

    profileModel.getProfileImagePath(user_id, (err, result) => {

        const oldImagePath = (!err && result.length > 0) ? result[0].profile_image : null;

        profileModel.updateProfileImage(user_id, newImagePath, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/admin/profile?imgError=1");

            }

            if (oldImagePath) {

                const oldFullPath = path.join(__dirname, "..", "public", oldImagePath);

                fs.unlink(oldFullPath, (unlinkErr) => {
                    if (unlinkErr) console.log("Old profile image cleanup skipped:", unlinkErr.message);
                });

            }

            req.session.user.profile_image = newImagePath;

            return res.redirect("/admin/profile?imgUpdated=1");

        });

    });

};

// =====================================================
// PROFILE -- DELETE PHOTO
// =====================================================

exports.postDeleteProfileImage = (req, res) => {

    const user_id = req.session.user.user_id;

    profileModel.getProfileImagePath(user_id, (err, result) => {

        if (err) {

            console.log(err);

            return res.redirect("/admin/profile?imgError=1");

        }

        const currentImagePath = (result.length > 0) ? result[0].profile_image : null;

        profileModel.deleteProfileImage(user_id, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/admin/profile?imgError=1");

            }

            if (currentImagePath) {

                const fullPath = path.join(__dirname, "..", "public", currentImagePath);

                fs.unlink(fullPath, (unlinkErr) => {
                    if (unlinkErr) console.log("Profile image cleanup skipped:", unlinkErr.message);
                });

            }

            req.session.user.profile_image = null;

            return res.redirect("/admin/profile?imgDeleted=1");

        });

    });

};

// =====================================================
// NOTIFICATIONS -- VIEW
// =====================================================

exports.getNotifications = (req, res) => {

    const user_id = req.session.user.user_id;

    notificationModel.getNotificationsByUser(user_id, (err, notifications) => {

        if (err) {
            console.log(err);

            return res.render("admin/notifications", {
                currentPage: "notifications",
                notifications: [],
                errorMsg: "Unable to load notifications right now."
            });
        }

        res.render("admin/notifications", {
            currentPage: "notifications",
            notifications: notifications,
            errorMsg: null
        });

    });

};


// =====================================================
// NOTIFICATIONS -- MARK ONE AS READ
// =====================================================

exports.postMarkNotificationRead = (req, res) => {

    const user_id = req.session.user.user_id;
    const notification_id = req.params.notification_id;

    notificationModel.markAsRead(
        notification_id,
        user_id,
        (err) => {

            if (err) {
                console.log(err);
            }

            return res.redirect("/admin/notifications");
        }
    );

};


// =====================================================
// NOTIFICATIONS -- MARK ALL AS READ
// =====================================================

exports.postMarkAllNotificationsRead = (req, res) => {

    const user_id = req.session.user.user_id;

    notificationModel.markAllAsRead(user_id, (err) => {

        if (err) {
            console.log(err);
        }

        return res.redirect("/admin/notifications");
    });

};


// =====================================================
// NOTIFICATIONS -- DELETE
// =====================================================

exports.postDeleteNotification = (req, res) => {

    const user_id = req.session.user.user_id;
    const notification_id = req.params.notification_id;

    notificationModel.deleteNotification(
        notification_id,
        user_id,
        (err) => {

            if (err) {
                console.log(err);
            }

            return res.redirect("/admin/notifications");
        }
    );

};