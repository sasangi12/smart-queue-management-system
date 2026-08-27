const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const receptionistModel = require("../models/receptionistModel");
const notificationModel = require("../models/notificationModel");
const userModel = require("../models/userModel");

const clinicModel = require("../models/clinicModel");
const scheduleModel = require("../models/scheduleModel");
const appointmentModel = require("../models/appointmentModel");
const queueModel = require("../models/queueModel");

// Generic, role-agnostic helpers (users-table only) --
// already built for the Patient module, reused here as-is
// (via the new getUserBasicInfo, since Receptionist has no
// second table like doctors/patients do).
const profileModel = require("../models/profileModel");

// =====================================================
// Small date helpers
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
// RECEPTIONIST DASHBOARD
// =====================================================

exports.getDashboard = (req, res) => {

    const user_id = req.session.user.user_id;

    const stats = {
        todayCount: 0,
        totalPatients: 0,
        todaySessions: 0,
        waitingCount: 0
    };

    let todayAppointments = [];
    let recentNotifications = [];

    let pending = 6;

    function checkDone() {

        pending--;

        if (pending === 0) {

            res.render("receptionist/dashboard", {
                currentPage: "dashboard",
                stats: stats,
                todayAppointments: todayAppointments.slice(0, 6),
                recentNotifications: recentNotifications
            });

        }

    }

    receptionistModel.countTodayAppointments((err, result) => {

        if (!err && result.length > 0) {
            stats.todayCount = result[0].total;
        }

        checkDone();

    });

    receptionistModel.countTotalPatients((err, result) => {

        if (!err && result.length > 0) {
            stats.totalPatients = result[0].total;
        }

        checkDone();

    });

    receptionistModel.countTodaySessions((err, result) => {

        if (!err && result.length > 0) {
            stats.todaySessions = result[0].total;
        }

        checkDone();

    });

    receptionistModel.countWaitingToday((err, result) => {

        if (!err && result.length > 0) {
            stats.waitingCount = result[0].total;
        }

        checkDone();

    });

    receptionistModel.getTodayAppointmentsOverview((err, result) => {

        if (!err) {
            todayAppointments = result;
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
// REGISTER PATIENT -- PAGE
// =====================================================

exports.getRegisterPatient = (req, res) => {

    const searchTerm = typeof req.query.search === "string" ? req.query.search.trim() : "";

    receptionistModel.getPatientsList(searchTerm, (err, patients) => {

        if (err) {
            console.log(err);
            patients = [];
        }

        let successMsg = null;
        let errorMsg = null;

        if (req.query.registered === "1") {
            successMsg = "Patient registered successfully.";
        }

        if (req.query.error === "email") errorMsg = "That email address is already registered.";
        if (req.query.error === "nic") errorMsg = "That NIC number is already registered.";
        if (req.query.error === "password") errorMsg = "Password must be at least 6 characters.";
        if (req.query.error === "mismatch") errorMsg = "Password and confirmation do not match.";
        if (req.query.error === "fields") errorMsg = "Please fill in all required fields.";
        if (req.query.error === "email_format") errorMsg = "Please enter a valid email address.";
        if (req.query.error === "1") errorMsg = "Unable to register the patient. Please try again.";

        res.render("receptionist/registerPatient", {
            currentPage: "registerPatient",
            patients: patients,
            searchTerm: searchTerm,
            successMsg: successMsg,
            errorMsg: errorMsg
        });

    });

};

// =====================================================
// REGISTER PATIENT -- CREATE
// =====================================================

exports.postRegisterPatient = (req, res) => {

    const {

        full_name,
        nic,
        dob,
        gender,
        email,
        phone,
        address,
        password,
        confirmPassword

    } = req.body;

    if (
        !full_name ||
        !nic ||
        !dob ||
        !gender ||
        !email ||
        !phone ||
        !address ||
        !password ||
        !confirmPassword
    ) {

        return res.redirect("/receptionist/registerPatient?error=fields");

    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        return res.redirect("/receptionist/registerPatient?error=email_format");

    }

    if (password.length < 6) {

        return res.redirect("/receptionist/registerPatient?error=password");

    }

    if (password !== confirmPassword) {

        return res.redirect("/receptionist/registerPatient?error=mismatch");

    }

    userModel.findUserByEmail(email, (err, emailResult) => {

        if (err) {

            console.log(err);

            return res.redirect("/receptionist/registerPatient?error=1");

        }

        if (emailResult.length > 0) {

            return res.redirect("/receptionist/registerPatient?error=email");

        }

        userModel.findPatientByNIC(nic, (err, nicResult) => {

            if (err) {

                console.log(err);

                return res.redirect("/receptionist/registerPatient?error=1");

            }

            if (nicResult.length > 0) {

                return res.redirect("/receptionist/registerPatient?error=nic");

            }

            bcrypt.hash(password, 10, (err, hashedPassword) => {

                if (err) {

                    console.log(err);

                    return res.redirect("/receptionist/registerPatient?error=1");

                }

                const role_id = 3;

                const userData = [

                    role_id,
                    full_name,
                    email,
                    phone,
                    hashedPassword

                ];

                userModel.createUser(userData, (err, userResult) => {

                    if (err) {

                        console.log(err);

                        return res.redirect("/receptionist/registerPatient?error=1");

                    }

                    const user_id = userResult.insertId;

                    const patientData = [

                        user_id,
                        nic,
                        gender,
                        dob,
                        address

                    ];

                    userModel.createPatient(patientData, (err) => {

                        if (err) {

                            console.log(err);

                            return res.redirect("/receptionist/registerPatient?error=1");

                        }

                        return res.redirect("/receptionist/registerPatient?registered=1");

                    });

                });

            });

        });

    });

};

// =====================================================
// APPOINTMENTS -- PAGE
// =====================================================

exports.getAppointments = (req, res) => {

    const todayDateString = getTodayDateString();

    const requestedDate = req.query.date;
    const isValidDate = typeof requestedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate);
    const selectedDate = isValidDate ? requestedDate : todayDateString;

    receptionistModel.getAppointmentsByDate(selectedDate, (err, appointments) => {

        if (err) {
            console.log(err);
            appointments = [];
        }

        clinicModel.getAllClinics((err, clinics) => {

            if (err) {
                console.log(err);
                clinics = [];
            }

            let successMsg = null;
            let errorMsg = null;

            if (req.query.success === "booked") successMsg = "Appointment booked successfully.";
            if (req.query.success === "cancelled") successMsg = "Appointment cancelled successfully.";

            if (req.query.error === "patient") errorMsg = "Please select a patient before booking.";
            if (req.query.error === "schedule") errorMsg = "Please select an available doctor session.";
            if (req.query.error === "full") errorMsg = "That session is already fully booked.";
            if (req.query.error === "duplicate") errorMsg = "This patient already has a booking for that session.";
            if (req.query.error === "1") errorMsg = "Something went wrong. Please try again.";

            res.render("receptionist/appointments", {
                currentPage: "appointments",
                appointments: appointments,
                clinics: clinics,
                selectedDate: selectedDate,
                todayDateString: todayDateString,
                prevDate: shiftDateString(selectedDate, -1),
                nextDate: shiftDateString(selectedDate, 1),
                successMsg: successMsg,
                errorMsg: errorMsg
            });

        });

    });

};

// =====================================================
// APPOINTMENTS -- AJAX: Schedules for a Clinic
// =====================================================

exports.getSchedulesByClinic = (req, res) => {

    const clinic_id = req.params.clinic_id;

    scheduleModel.getSchedulesByClinic(clinic_id, (err, schedules) => {

        if (err) {

            console.log(err);

            return res.status(500).json({ error: "Failed to load schedules." });

        }

        const availableSchedules = schedules
            .map((s) => ({
                schedule_id: s.schedule_id,
                doctor_name: s.doctor_name,
                specialization: s.specialization,
                room_no: s.room_no,
                date: s.date,
                start_time: s.start_time,
                end_time: s.end_time,
                max_patients: s.max_patients,
                booked_count: s.booked_count,
                slots_left: s.max_patients - s.booked_count
            }))
            .filter((s) => s.slots_left > 0);

        res.json(availableSchedules);

    });

};

// =====================================================
// APPOINTMENTS -- AJAX: Patient Search (typeahead)
// =====================================================

exports.searchPatientsAjax = (req, res) => {

    const searchTerm = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (searchTerm.length < 2) {
        return res.json([]);
    }

    receptionistModel.searchPatients(searchTerm, (err, patients) => {

        if (err) {

            console.log(err);

            return res.status(500).json({ error: "Search failed." });

        }

        res.json(patients);

    });

};

// =====================================================
// APPOINTMENTS -- BOOK ON A PATIENT'S BEHALF
// =====================================================

exports.postBookAppointment = (req, res) => {

    const { patient_id, schedule_id, priority_type } = req.body;

    if (!patient_id) {
        return res.redirect("/receptionist/appointments?error=patient");
    }

    if (!schedule_id) {
        return res.redirect("/receptionist/appointments?error=schedule");
    }

    const allowedPriorities = ["Normal", "Elderly", "Pregnant", "Disabled"];
    const finalPriority = allowedPriorities.includes(priority_type) ? priority_type : "Normal";

    scheduleModel.getScheduleById(schedule_id, (err, scheduleResult) => {

        if (err || scheduleResult.length === 0) {

            console.log(err);

            return res.redirect("/receptionist/appointments?error=schedule");

        }

        const schedule = scheduleResult[0];

        if (schedule.booked_count >= schedule.max_patients) {

            return res.redirect("/receptionist/appointments?error=full");

        }

        appointmentModel.findExistingBooking(patient_id, schedule_id, (err, existing) => {

            if (err) {

                console.log(err);

                return res.redirect("/receptionist/appointments?error=1");

            }

            if (existing.length > 0) {

                return res.redirect("/receptionist/appointments?error=duplicate");

            }

            const appointmentData = [patient_id, schedule_id, schedule.date];

            appointmentModel.createAppointment(appointmentData, (err, appointmentResult) => {

                if (err) {

                    console.log(err);

                    return res.redirect("/receptionist/appointments?error=1");

                }

                const appointment_id = appointmentResult.insertId;

                queueModel.countQueueForSchedule(schedule_id, (err, countResult) => {

                    if (err) {

                        console.log(err);

                        return res.redirect(`/receptionist/appointments?date=${schedule.date}&error=1`);

                    }

                    const position = countResult[0].total + 1;

                    queueModel.createQueueEntry(appointment_id, position, finalPriority, (err) => {

                        if (err) {

                            console.log(err);

                            return res.redirect(`/receptionist/appointments?date=${schedule.date}&error=1`);

                        }

                        notificationModel.getAppointmentTargets(appointment_id, (targetErr, targets) => {

                            if (targetErr || targets.length === 0) {
                                if (targetErr) console.log("Notification target lookup failed:", targetErr);
                                return res.redirect(`/receptionist/appointments?date=${schedule.date}&success=booked`);
                            }

                            const booking = targets[0];
                            const appointmentDate = new Date(booking.appointment_date).toISOString().slice(0, 10);
                            const time = `${String(booking.start_time).slice(0, 5)} - ${String(booking.end_time).slice(0, 5)}`;
                            const patientMessage = `Your appointment with ${booking.doctor_name} at ${booking.clinic_name} on ${appointmentDate} (${time}) has been confirmed by reception. Queue number: ${booking.queue_number}, position: ${booking.queue_position}.`;
                            const doctorMessage = `Reception booked a new appointment for ${booking.patient_name} at ${booking.clinic_name} on ${appointmentDate} (${time}). Queue number: ${booking.queue_number}.`;

                            notificationModel.createNotificationsForUsers([booking.patient_user_id], "Appointment Confirmed", patientMessage, "Appointment", (patientNotifErr) => {
                                if (patientNotifErr) console.log("Patient notification error:", patientNotifErr);

                                notificationModel.createNotificationsForUsers([booking.doctor_user_id], "New Appointment Booked", doctorMessage, "Appointment", (doctorNotifErr) => {
                                    if (doctorNotifErr) console.log("Doctor notification error:", doctorNotifErr);
                                    return res.redirect(`/receptionist/appointments?date=${schedule.date}&success=booked`);
                                });
                            });

                        });

                    });

                });

            });

        });

    });

};

// =====================================================
// APPOINTMENTS -- CANCEL (any patient's booking)
// =====================================================

exports.postCancelAppointment = (req, res) => {

    const appointment_id = req.params.appointment_id;
    const selectedDate = req.body.date;

    receptionistModel.cancelAppointmentAny(appointment_id, (err, result) => {

        if (err || result.affectedRows === 0) {

            console.log(err);

            return res.redirect(`/receptionist/appointments?date=${selectedDate}&error=1`);

        }

        queueModel.cancelQueueEntry(appointment_id, (err) => {

            if (err) {
                console.log(err);
            }

            return res.redirect(`/receptionist/appointments?date=${selectedDate}&success=cancelled`);

        });

    });

};

// =====================================================
// QUEUE OVERVIEW -- PAGE
// =====================================================

exports.getQueueOverview = (req, res) => {

    const todayDateString = getTodayDateString();

    const requestedDate = req.query.date;
    const isValidDate = typeof requestedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate);
    const selectedDate = isValidDate ? requestedDate : todayDateString;

    const patientSearch = typeof req.query.patientSearch === "string" ? req.query.patientSearch.trim() : "";

    receptionistModel.getSessionsOverview(selectedDate, (err, sessions) => {

        if (err) {
            console.log(err);
            sessions = [];
        }

        receptionistModel.getAppointmentsByDate(selectedDate, (err, queueList) => {

            if (err) {
                console.log(err);
                queueList = [];
            }

            function renderPage(lookupResults) {

                res.render("receptionist/queueOverview", {
                    currentPage: "queue",
                    sessions: sessions,
                    queueList: queueList,
                    selectedDate: selectedDate,
                    todayDateString: todayDateString,
                    prevDate: shiftDateString(selectedDate, -1),
                    nextDate: shiftDateString(selectedDate, 1),
                    patientSearch: patientSearch,
                    lookupResults: lookupResults
                });

            }

            if (patientSearch.length >= 2) {

                receptionistModel.getPatientQueueLookup(patientSearch, (err, lookupResults) => {

                    if (err) {
                        console.log(err);
                        lookupResults = [];
                    }

                    renderPage(lookupResults);

                });

            } else {

                renderPage([]);

            }

        });

    });

};

// =====================================================
// PROFILE -- VIEW
// -----------------------------------------------------
// Receptionist has NO second table (no doctors/patients
// row) -- profileModel.getUserBasicInfo reads only from
// `users`, so this is simpler than the Doctor/Patient
// versions (no join, no second table to update).
// =====================================================

exports.getProfile = (req, res) => {

    const user_id = req.session.user.user_id;

    profileModel.getUserBasicInfo(user_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.render("receptionist/profile", {
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

        res.render("receptionist/profile", {
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

        return res.redirect("/receptionist/profile?error=1");

    }

    profileModel.findEmailUsedByOthers(email, user_id, (err, emailMatches) => {

        if (err) {

            console.log(err);

            return res.redirect("/receptionist/profile?error=1");

        }

        if (emailMatches.length > 0) {

            return res.redirect("/receptionist/profile?error=email");

        }

        profileModel.updateUserInfo(user_id, { full_name, email, phone }, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/receptionist/profile?error=1");

            }

            req.session.user.full_name = full_name;
            req.session.user.email = email;
            req.session.user.phone = phone;

            return res.redirect("/receptionist/profile?updated=1");

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

        return res.redirect("/receptionist/profile?pwError=1");

    }

    if (newPassword.length < 6) {

        return res.redirect("/receptionist/profile?pwError=length");

    }

    if (newPassword !== confirmNewPassword) {

        return res.redirect("/receptionist/profile?pwError=confirm");

    }

    profileModel.getPasswordHash(user_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.redirect("/receptionist/profile?pwError=1");

        }

        const currentHash = result[0].password;

        bcrypt.compare(currentPassword, currentHash, (err, isMatch) => {

            if (err) {

                console.log(err);

                return res.redirect("/receptionist/profile?pwError=1");

            }

            if (!isMatch) {

                return res.redirect("/receptionist/profile?pwError=mismatch");

            }

            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {

                if (err) {

                    console.log(err);

                    return res.redirect("/receptionist/profile?pwError=1");

                }

                profileModel.updatePassword(user_id, hashedPassword, (err) => {

                    if (err) {

                        console.log(err);

                        return res.redirect("/receptionist/profile?pwError=1");

                    }

                    return res.redirect("/receptionist/profile?pwUpdated=1");

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

        return res.redirect("/receptionist/profile?imgError=1");

    }

    const newImagePath = "/uploads/profile/" + req.file.filename;

    profileModel.getProfileImagePath(user_id, (err, result) => {

        const oldImagePath = (!err && result.length > 0) ? result[0].profile_image : null;

        profileModel.updateProfileImage(user_id, newImagePath, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/receptionist/profile?imgError=1");

            }

            if (oldImagePath) {

                const oldFullPath = path.join(__dirname, "..", "public", oldImagePath);

                fs.unlink(oldFullPath, (unlinkErr) => {
                    if (unlinkErr) console.log("Old profile image cleanup skipped:", unlinkErr.message);
                });

            }

            req.session.user.profile_image = newImagePath;

            return res.redirect("/receptionist/profile?imgUpdated=1");

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

            return res.redirect("/receptionist/profile?imgError=1");

        }

        const currentImagePath = (result.length > 0) ? result[0].profile_image : null;

        profileModel.deleteProfileImage(user_id, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/receptionist/profile?imgError=1");

            }

            if (currentImagePath) {

                const fullPath = path.join(__dirname, "..", "public", currentImagePath);

                fs.unlink(fullPath, (unlinkErr) => {
                    if (unlinkErr) console.log("Profile image cleanup skipped:", unlinkErr.message);
                });

            }

            req.session.user.profile_image = null;

            return res.redirect("/receptionist/profile?imgDeleted=1");

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

            return res.render("receptionist/notifications", {
                currentPage: "notifications",
                notifications: [],
                errorMsg: "Unable to load notifications right now."
            });
        }

        res.render("receptionist/notifications", {
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

            return res.redirect("/receptionist/notifications");
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

        return res.redirect("/receptionist/notifications");
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

            return res.redirect("/receptionist/notifications");
        }
    );

};