const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const patientModel = require("../models/patientModel");
const clinicModel = require("../models/clinicModel");
const scheduleModel = require("../models/scheduleModel");
const appointmentModel = require("../models/appointmentModel");
const queueModel = require("../models/queueModel");
const notificationModel = require("../models/notificationModel");
const profileModel = require("../models/profileModel");

// =====================================================
// PATIENT DASHBOARD
// =====================================================

exports.getDashboard = (req, res) => {

    const user_id = req.session.user.user_id;

    patientModel.getPatientByUserId(user_id, (err, patientResult) => {

        if (err || patientResult.length === 0) {

            console.log(err);

            return res.render("patient/dashboard", {
                currentPage: "dashboard",
                stats: {
                    totalAppointments: 0,
                    currentQueue: null,
                    nextAppointment: null,
                    recentAppointments: [],
                    recentNotifications: []
                }
            });

        }

        const patient_id = patientResult[0].patient_id;

        const stats = {
            totalAppointments: 0,
            currentQueue: null,
            nextAppointment: null,
            recentAppointments: [],
            recentNotifications: []
        };

        let pending = 5;

        function checkDone() {

            pending--;

            if (pending === 0) {

                res.render("patient/dashboard", {
                    currentPage: "dashboard",
                    stats: stats
                });

            }

        }

        appointmentModel.countAppointmentsByPatient(patient_id, (err, result) => {

            if (!err && result.length > 0) {
                stats.totalAppointments = result[0].total;
            }

            checkDone();

        });

        appointmentModel.getNextAppointment(patient_id, (err, result) => {

            if (!err && result.length > 0) {
                stats.nextAppointment = result[0];
            }

            checkDone();

        });

        appointmentModel.getRecentAppointments(patient_id, 5, (err, result) => {

            if (!err) {
                stats.recentAppointments = result;
            }

            checkDone();

        });

        queueModel.getQueueStatusByPatient(patient_id, (err, result) => {

            if (!err && result.length > 0) {
                stats.currentQueue = result[0];
            }

            checkDone();

        });

        notificationModel.getRecentNotifications(user_id, 3, (err, result) => {

            if (!err) {
                stats.recentNotifications = result;
            }

            checkDone();

        });

    });

};

// =====================================================
// SHOW BOOK APPOINTMENT PAGE
// =====================================================

exports.getBookAppointment = (req, res) => {

    clinicModel.getAllClinics((err, clinics) => {

        if (err) {

            console.log(err);

            return res.render("patient/bookAppointment", {
                currentPage: "bookAppointment",
                clinics: [],
                errorMsg: "Unable to load clinics right now.",
                successMsg: null
            });

        }

        res.render("patient/bookAppointment", {
            currentPage: "bookAppointment",
            clinics: clinics,
            errorMsg: null,
            successMsg: req.query.success ? "Appointment booked successfully! Your queue number has been generated." : null
        });

    });

};

// =====================================================
// GET AVAILABLE SCHEDULES FOR A CLINIC (AJAX / JSON)
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
// SUBMIT BOOKING (CREATE APPOINTMENT + QUEUE ENTRY)
// =====================================================

exports.postBookAppointment = (req, res) => {

    const { schedule_id, priority_type } = req.body;
    const user_id = req.session.user.user_id;

    if (!schedule_id) {

        return res.redirect("/patient/bookAppointment?error=missing");

    }

    const allowedPriorities = ["Normal", "Elderly", "Pregnant", "Disabled"];
    const finalPriority = allowedPriorities.includes(priority_type) ? priority_type : "Normal";

    patientModel.getPatientByUserId(user_id, (err, patientResult) => {

        if (err || patientResult.length === 0) {

            console.log(err);

            return res.send("Unable to find patient record.");

        }

        const patient_id = patientResult[0].patient_id;

        scheduleModel.getScheduleById(schedule_id, (err, scheduleResult) => {

            if (err || scheduleResult.length === 0) {

                console.log(err);

                return res.send("Selected schedule no longer exists.");

            }

            const schedule = scheduleResult[0];

            if (schedule.booked_count >= schedule.max_patients) {

                return res.send("Sorry, this session is already fully booked.");

            }

            appointmentModel.findExistingBooking(patient_id, schedule_id, (err, existing) => {

                if (err) {

                    console.log(err);

                    return res.send("Database Error.");

                }

                if (existing.length > 0) {

                    return res.send("You have already booked this session.");

                }

                const appointmentData = [
                    patient_id,
                    schedule_id,
                    schedule.date
                ];

                appointmentModel.createAppointment(appointmentData, (err, appointmentResult) => {

                    if (err) {

                        console.log(err);

                        return res.send("Failed to create appointment.");

                    }

                    const appointment_id = appointmentResult.insertId;

                    queueModel.countQueueForSchedule(schedule_id, (err, countResult) => {

                        if (err) {

                            console.log(err);

                            return res.send("Appointment created, but queue setup failed.");

                        }

                        const position = countResult[0].total + 1;

                        queueModel.createQueueEntry(appointment_id, position, finalPriority, (err) => {

                            if (err) {

                                console.log(err);

                                return res.send("Appointment created, but queue setup failed.");

                            }

                            notificationModel.getAppointmentTargets(appointment_id, (targetErr, targets) => {

                                if (targetErr || targets.length === 0) {
                                    if (targetErr) console.log("Notification target lookup failed:", targetErr);
                                    return res.redirect("/patient/bookAppointment?success=1");
                                }

                                const booking = targets[0];
                                const appointmentDate = new Date(booking.appointment_date).toISOString().slice(0, 10);
                                const time = `${String(booking.start_time).slice(0, 5)} - ${String(booking.end_time).slice(0, 5)}`;

                                const patientMessage = `Your appointment with ${booking.doctor_name} at ${booking.clinic_name} on ${appointmentDate} (${time}) has been confirmed. Queue number: ${booking.queue_number}, position: ${booking.queue_position}.`;
                                const doctorMessage = `New appointment booked by ${booking.patient_name} for ${booking.clinic_name} on ${appointmentDate} (${time}). Queue number: ${booking.queue_number}.`;

                                notificationModel.createNotificationsForUsers([booking.patient_user_id], "Appointment Confirmed", patientMessage, "Appointment", (patientNotifErr) => {

                                    if (patientNotifErr) console.log("Patient notification error:", patientNotifErr);

                                    notificationModel.createNotificationsForUsers([booking.doctor_user_id], "New Appointment Booked", doctorMessage, "Appointment", (doctorNotifErr) => {

                                        if (doctorNotifErr) console.log("Doctor notification error:", doctorNotifErr);

                                        notificationModel.getActiveStaffUserIds((staffErr, staffUsers) => {

                                            if (staffErr) {
                                                console.log("Staff notification target lookup error:", staffErr);
                                                return res.redirect("/patient/bookAppointment?success=1");
                                            }

                                            const staffIds = staffUsers.map(row => row.user_id).filter(id => id !== booking.patient_user_id && id !== booking.doctor_user_id);
                                            const staffMessage = `${booking.patient_name} booked an appointment with ${booking.doctor_name} at ${booking.clinic_name} on ${appointmentDate} (${time}). Queue number: ${booking.queue_number}.`;

                                            notificationModel.createNotificationsForUsers(staffIds, "New Appointment Booked", staffMessage, "Appointment", (staffNotifErr) => {
                                                if (staffNotifErr) console.log("Staff notification error:", staffNotifErr);
                                                return res.redirect("/patient/bookAppointment?success=1");
                                            });

                                        });

                                    });

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
// MY APPOINTMENTS -- LIST
// =====================================================

exports.getAppointments = (req, res) => {

    const user_id = req.session.user.user_id;

    patientModel.getPatientByUserId(user_id, (err, patientResult) => {

        if (err || patientResult.length === 0) {

            console.log(err);

            return res.render("patient/appointments", {
                currentPage: "appointments",
                appointments: [],
                errorMsg: "Unable to load your appointments right now.",
                successMsg: null
            });

        }

        const patient_id = patientResult[0].patient_id;

        appointmentModel.getAppointmentsByPatient(patient_id, (err, appointments) => {

            if (err) {

                console.log(err);

                return res.render("patient/appointments", {
                    currentPage: "appointments",
                    appointments: [],
                    errorMsg: "Unable to load your appointments right now.",
                    successMsg: null
                });

            }

            let successMsg = null;
            let errorMsg = null;

            if (req.query.cancelled === "1") {
                successMsg = "Appointment cancelled successfully.";
            }

            if (req.query.error === "1") {
                errorMsg = "Unable to cancel that appointment.";
            }

            res.render("patient/appointments", {
                currentPage: "appointments",
                appointments: appointments,
                errorMsg: errorMsg,
                successMsg: successMsg
            });

        });

    });

};

// =====================================================
// MY APPOINTMENTS -- CANCEL
// =====================================================

exports.postCancelAppointment = (req, res) => {

    const appointment_id = req.params.appointment_id;
    const user_id = req.session.user.user_id;

    patientModel.getPatientByUserId(user_id, (err, patientResult) => {

        if (err || patientResult.length === 0) {

            console.log(err);

            return res.redirect("/patient/appointments?error=1");

        }

        const patient_id = patientResult[0].patient_id;

        appointmentModel.getAppointmentByIdForPatient(appointment_id, patient_id, (err, result) => {

            if (err || result.length === 0) {

                console.log(err);

                return res.redirect("/patient/appointments?error=1");

            }

            appointmentModel.cancelAppointment(appointment_id, patient_id, (err, updateResult) => {

                if (err || updateResult.affectedRows === 0) {

                    console.log(err);

                    return res.redirect("/patient/appointments?error=1");

                }

                queueModel.cancelQueueEntry(appointment_id, (err) => {

                    if (err) {
                        console.log(err);
                    }

                    return res.redirect("/patient/appointments?cancelled=1");

                });

            });

        });

    });

};

// =====================================================
// QUEUE STATUS -- PAGE
// =====================================================

exports.getQueueStatus = (req, res) => {

    const user_id = req.session.user.user_id;

    patientModel.getPatientByUserId(user_id, (err, patientResult) => {

        if (err || patientResult.length === 0) {

            console.log(err);

            return res.render("patient/queue", {
                currentPage: "queue",
                queueItems: [],
                errorMsg: "Unable to load your queue status right now."
            });

        }

        const patient_id = patientResult[0].patient_id;

        queueModel.getQueueStatusByPatient(patient_id, (err, queueItems) => {

            if (err) {

                console.log(err);

                return res.render("patient/queue", {
                    currentPage: "queue",
                    queueItems: [],
                    errorMsg: "Unable to load your queue status right now."
                });

            }

            res.render("patient/queue", {
                currentPage: "queue",
                queueItems: queueItems,
                errorMsg: null
            });

        });

    });

};

// =====================================================
// QUEUE STATUS -- AJAX / JSON
// =====================================================

exports.getQueueStatusJson = (req, res) => {

    const user_id = req.session.user.user_id;

    patientModel.getPatientByUserId(user_id, (err, patientResult) => {

        if (err || patientResult.length === 0) {

            console.log(err);

            return res.status(500).json({ error: "Unable to load queue status." });

        }

        const patient_id = patientResult[0].patient_id;

        queueModel.getQueueStatusByPatient(patient_id, (err, queueItems) => {

            if (err) {

                console.log(err);

                return res.status(500).json({ error: "Unable to load queue status." });

            }

            res.json(queueItems);

        });

    });

};

// =====================================================
// NOTIFICATIONS -- LIST
// =====================================================

exports.getNotifications = (req, res) => {

    const user_id = req.session.user.user_id;

    notificationModel.getNotificationsByUser(user_id, (err, notifications) => {

        if (err) {

            console.log(err);

            return res.render("patient/notifications", {
                currentPage: "notifications",
                notifications: [],
                errorMsg: "Unable to load notifications right now."
            });

        }

        res.render("patient/notifications", {
            currentPage: "notifications",
            notifications: notifications,
            errorMsg: null
        });

    });

};

// =====================================================
// NOTIFICATIONS -- MARK ONE AS READ (AJAX)
// =====================================================

exports.postMarkNotificationRead = (req, res) => {

    const notification_id = req.params.notification_id;
    const user_id = req.session.user.user_id;

    notificationModel.markAsRead(notification_id, user_id, (err, result) => {

        if (err) {

            console.log(err);

            return res.status(500).json({ success: false });

        }

        res.json({ success: true });

    });

};

// =====================================================
// NOTIFICATIONS -- MARK ALL AS READ
// =====================================================

exports.postMarkAllNotificationsRead = (req, res) => {

    const user_id = req.session.user.user_id;

    notificationModel.markAllAsRead(user_id, (err) => {

        if (err) {

            console.log(err);

            return res.redirect("/patient/notifications?error=1");

        }

        res.redirect("/patient/notifications");

    });

};

// =====================================================
// NOTIFICATIONS -- DELETE ONE
// =====================================================

exports.postDeleteNotification = (req, res) => {

    const notification_id = req.params.notification_id;
    const user_id = req.session.user.user_id;

    notificationModel.deleteNotification(notification_id, user_id, (err) => {

        if (err) {

            console.log(err);

            return res.redirect("/patient/notifications?error=1");

        }

        res.redirect("/patient/notifications");

    });

};

// =====================================================
// PROFILE -- VIEW
// =====================================================

exports.getProfile = (req, res) => {

    const user_id = req.session.user.user_id;

    profileModel.getFullProfile(user_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.render("patient/profile", {
                currentPage: "profile",
                profile: null,
                successMsg: null,
                errorMsg: "Unable to load your profile right now.",
                passwordErrorMsg: null,
                passwordSuccessMsg: null
            });

        }

        let successMsg = null;
        let errorMsg = null;
        let passwordSuccessMsg = null;
        let passwordErrorMsg = null;

        if (req.query.updated === "1") successMsg = "Profile updated successfully.";
        if (req.query.error === "email") errorMsg = "That email is already in use by another account.";
        if (req.query.error === "nic") errorMsg = "That NIC is already registered to another account.";
        if (req.query.error === "1") errorMsg = "Unable to update your profile. Please try again.";

        // Profile photo messages (share the same alert slot as the info tab)
        if (req.query.imgUpdated === "1") successMsg = "Profile photo updated successfully.";
        if (req.query.imgDeleted === "1") successMsg = "Profile photo removed.";
        if (req.query.imgError === "1") errorMsg = "Unable to update your profile photo. Please use a JPG, PNG, or WEBP file under 2MB.";

        if (req.query.pwUpdated === "1") passwordSuccessMsg = "Password changed successfully.";
        if (req.query.pwError === "mismatch") passwordErrorMsg = "Current password is incorrect.";
        if (req.query.pwError === "confirm") passwordErrorMsg = "New password and confirmation do not match.";
        if (req.query.pwError === "length") passwordErrorMsg = "New password must be at least 6 characters.";
        if (req.query.pwError === "1") passwordErrorMsg = "Unable to change your password. Please try again.";

        res.render("patient/profile", {
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
// PROFILE -- UPDATE (users + patients info)
// =====================================================

exports.postUpdateProfile = (req, res) => {

    const user_id = req.session.user.user_id;

    const {
        full_name,
        email,
        phone,
        nic,
        gender,
        dob,
        address
    } = req.body;

    if (!full_name || !email || !phone || !nic || !gender || !dob || !address) {

        return res.redirect("/patient/profile?error=1");

    }

    patientModel.getPatientByUserId(user_id, (err, patientResult) => {

        if (err || patientResult.length === 0) {

            console.log(err);

            return res.redirect("/patient/profile?error=1");

        }

        const patient_id = patientResult[0].patient_id;

        profileModel.findEmailUsedByOthers(email, user_id, (err, emailMatches) => {

            if (err) {

                console.log(err);

                return res.redirect("/patient/profile?error=1");

            }

            if (emailMatches.length > 0) {

                return res.redirect("/patient/profile?error=email");

            }

            profileModel.findNicUsedByOthers(nic, patient_id, (err, nicMatches) => {

                if (err) {

                    console.log(err);

                    return res.redirect("/patient/profile?error=1");

                }

                if (nicMatches.length > 0) {

                    return res.redirect("/patient/profile?error=nic");

                }

                profileModel.updateUserInfo(user_id, { full_name, email, phone }, (err) => {

                    if (err) {

                        console.log(err);

                        return res.redirect("/patient/profile?error=1");

                    }

                    profileModel.updatePatientInfo(patient_id, { nic, gender, dob, address }, (err) => {

                        if (err) {

                            console.log(err);

                            return res.redirect("/patient/profile?error=1");

                        }

                        req.session.user.full_name = full_name;
                        req.session.user.email = email;
                        req.session.user.phone = phone;

                        return res.redirect("/patient/profile?updated=1");

                    });

                });

            });

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

        return res.redirect("/patient/profile?pwError=1");

    }

    if (newPassword.length < 6) {

        return res.redirect("/patient/profile?pwError=length");

    }

    if (newPassword !== confirmNewPassword) {

        return res.redirect("/patient/profile?pwError=confirm");

    }

    profileModel.getPasswordHash(user_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.redirect("/patient/profile?pwError=1");

        }

        const currentHash = result[0].password;

        bcrypt.compare(currentPassword, currentHash, (err, isMatch) => {

            if (err) {

                console.log(err);

                return res.redirect("/patient/profile?pwError=1");

            }

            if (!isMatch) {

                return res.redirect("/patient/profile?pwError=mismatch");

            }

            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {

                if (err) {

                    console.log(err);

                    return res.redirect("/patient/profile?pwError=1");

                }

                profileModel.updatePassword(user_id, hashedPassword, (err) => {

                    if (err) {

                        console.log(err);

                        return res.redirect("/patient/profile?pwError=1");

                    }

                    return res.redirect("/patient/profile?pwUpdated=1");

                });

            });

        });

    });

};

// =====================================================
// PROFILE -- UPLOAD / REPLACE PHOTO
// -----------------------------------------------------
// req.file is populated by uploadMiddleware.uploadProfileImage
// (multer), which already ran before this controller.
// =====================================================

exports.postUploadProfileImage = (req, res) => {

    const user_id = req.session.user.user_id;

    if (!req.file) {

        return res.redirect("/patient/profile?imgError=1");

    }

    const newImagePath = "/uploads/profile/" + req.file.filename;

    // Find the OLD image (if any) so it can be deleted from disk
    // after the new one is safely saved in the database.
    profileModel.getProfileImagePath(user_id, (err, result) => {

        const oldImagePath = (!err && result.length > 0) ? result[0].profile_image : null;

        profileModel.updateProfileImage(user_id, newImagePath, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/patient/profile?imgError=1");

            }

            // Remove the old file from disk (best-effort — don't
            // block the response if this fails)
            if (oldImagePath) {

                const oldFullPath = path.join(__dirname, "..", "public", oldImagePath);

                fs.unlink(oldFullPath, (unlinkErr) => {
                    if (unlinkErr) console.log("Old profile image cleanup skipped:", unlinkErr.message);
                });

            }

            // Keep the session in sync so navbar/sidebar update
            // immediately without a fresh login
            req.session.user.profile_image = newImagePath;

            return res.redirect("/patient/profile?imgUpdated=1");

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

            return res.redirect("/patient/profile?imgError=1");

        }

        const currentImagePath = (result.length > 0) ? result[0].profile_image : null;

        profileModel.deleteProfileImage(user_id, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/patient/profile?imgError=1");

            }

            if (currentImagePath) {

                const fullPath = path.join(__dirname, "..", "public", currentImagePath);

                fs.unlink(fullPath, (unlinkErr) => {
                    if (unlinkErr) console.log("Profile image cleanup skipped:", unlinkErr.message);
                });

            }

            req.session.user.profile_image = null;

            return res.redirect("/patient/profile?imgDeleted=1");

        });

    });

};
