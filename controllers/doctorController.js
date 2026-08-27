const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const doctorModel = require("../models/doctorModel");
const doctorQueueModel = require("../models/doctorQueueModel");
const doctorPatientModel = require("../models/doctorPatientModel");
const notificationModel = require("../models/notificationModel");

// Generic, role-agnostic helpers (users-table only) --
// already built for the Patient module and reused here as-is.
const profileModel = require("../models/profileModel");

// =====================================================
// Small date helpers (used by the Appointments page)
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
// DOCTOR DASHBOARD
// =====================================================

exports.getDashboard = (req, res) => {

    const user_id = req.session.user.user_id;

    doctorModel.getDoctorByUserId(user_id, (err, doctorResult) => {

        if (err || doctorResult.length === 0) {

            console.log(err);

            return res.render("doctor/dashboard", {
                currentPage: "dashboard",
                doctor: null,
                stats: {
                    todayCount: 0,
                    waitingCount: 0,
                    nowServing: null,
                    totalPatients: 0
                },
                todayAppointments: [],
                recentNotifications: []
            });

        }

        const doctor = doctorResult[0];
        const doctor_id = doctor.doctor_id;

        doctorModel.getTodayAppointments(doctor_id, (err, todayAppointments) => {

            if (err) {
                console.log(err);
                todayAppointments = [];
            }

            const waitingCount = todayAppointments.filter(
                (a) => a.queue_status === "Waiting"
            ).length;

            const servingEntry = todayAppointments.find(
                (a) => a.queue_status === "Serving"
            );

            const stats = {
                todayCount: todayAppointments.length,
                waitingCount: waitingCount,
                nowServing: servingEntry ? servingEntry.queue_number : null,
                totalPatients: 0
            };

            let pending = 2;
            let recentNotifications = [];

            function checkDone() {

                pending--;

                if (pending === 0) {

                    res.render("doctor/dashboard", {
                        currentPage: "dashboard",
                        doctor: doctor,
                        stats: stats,
                        todayAppointments: todayAppointments.slice(0, 6),
                        recentNotifications: recentNotifications
                    });

                }

            }

            doctorModel.countTotalPatients(doctor_id, (err, totalResult) => {

                if (!err && totalResult.length > 0) {
                    stats.totalPatients = totalResult[0].total;
                }

                checkDone();

            });

            notificationModel.getRecentNotifications(user_id, 3, (err, result) => {

                if (!err) {
                    recentNotifications = result;
                }

                checkDone();

            });

        });

    });

};

// =====================================================
// TODAY'S APPOINTMENTS -- FULL LIST (any date, defaults to today)
// =====================================================

exports.getAppointments = (req, res) => {

    const user_id = req.session.user.user_id;
    const todayDateString = getTodayDateString();

    doctorModel.getDoctorByUserId(user_id, (err, doctorResult) => {

        if (err || doctorResult.length === 0) {

            console.log(err);

            return res.render("doctor/appointments", {
                currentPage: "appointments",
                doctor: null,
                appointments: [],
                selectedDate: todayDateString,
                todayDateString: todayDateString,
                prevDate: shiftDateString(todayDateString, -1),
                nextDate: shiftDateString(todayDateString, 1),
                errorMsg: "Unable to load your profile right now."
            });

        }

        const doctor = doctorResult[0];
        const doctor_id = doctor.doctor_id;

        const requestedDate = req.query.date;
        const isValidDate = typeof requestedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate);
        const selectedDate = isValidDate ? requestedDate : todayDateString;

        doctorModel.getAppointmentsByDate(doctor_id, selectedDate, (err, appointments) => {

            if (err) {
                console.log(err);
                appointments = [];
            }

            res.render("doctor/appointments", {
                currentPage: "appointments",
                doctor: doctor,
                appointments: appointments,
                selectedDate: selectedDate,
                todayDateString: todayDateString,
                prevDate: shiftDateString(selectedDate, -1),
                nextDate: shiftDateString(selectedDate, 1),
                errorMsg: null
            });

        });

    });

};

// =====================================================
// MANAGE QUEUE -- PAGE
// =====================================================

exports.getManageQueue = (req, res) => {

    const user_id = req.session.user.user_id;

    doctorModel.getDoctorByUserId(user_id, (err, doctorResult) => {

        if (err || doctorResult.length === 0) {

            console.log(err);

            return res.render("doctor/manageQueue", {
                currentPage: "queue",
                doctor: null,
                todaySessions: [],
                selectedSession: null,
                queueList: [],
                currentServing: null,
                nextWaiting: null,
                successMsg: null,
                errorMsg: "Unable to load your profile right now."
            });

        }

        const doctor = doctorResult[0];
        const doctor_id = doctor.doctor_id;

        doctorQueueModel.getTodaySessions(doctor_id, (err, todaySessions) => {

            if (err) {
                console.log(err);
                todaySessions = [];
            }

            if (todaySessions.length === 0) {

                return res.render("doctor/manageQueue", {
                    currentPage: "queue",
                    doctor: doctor,
                    todaySessions: [],
                    selectedSession: null,
                    queueList: [],
                    currentServing: null,
                    nextWaiting: null,
                    successMsg: null,
                    errorMsg: null
                });

            }

            const requestedScheduleId = req.query.schedule;

            let selectedSession = todaySessions.find(
                (s) => String(s.schedule_id) === String(requestedScheduleId)
            );

            if (!selectedSession) {
                selectedSession = todaySessions[0];
            }

            doctorQueueModel.getQueueForSession(selectedSession.schedule_id, (err, queueList) => {

                if (err) {
                    console.log(err);
                    queueList = [];
                }

                const currentServing = queueList.find((q) => q.queue_status === "Serving") || null;
                const nextWaiting = queueList.find((q) => q.queue_status === "Waiting") || null;

                let successMsg = null;
                let errorMsg = null;

                if (req.query.success === "called") successMsg = "Patient called in successfully.";
                if (req.query.success === "completed") successMsg = "Patient marked as completed.";
                if (req.query.success === "skipped") successMsg = "Patient skipped.";
                if (req.query.success === "paused") successMsg = "Queue paused.";
                if (req.query.success === "resumed") successMsg = "Queue resumed.";

                if (req.query.error === "paused") errorMsg = "Cannot call next patient -- the queue is currently paused.";
                if (req.query.error === "busy") errorMsg = "Please complete or skip the current patient before calling the next one.";
                if (req.query.error === "empty") errorMsg = "No patients are waiting in this session.";
                if (req.query.error === "1") errorMsg = "Something went wrong. Please try again.";

                res.render("doctor/manageQueue", {
                    currentPage: "queue",
                    doctor: doctor,
                    todaySessions: todaySessions,
                    selectedSession: selectedSession,
                    queueList: queueList,
                    currentServing: currentServing,
                    nextWaiting: nextWaiting,
                    successMsg: successMsg,
                    errorMsg: errorMsg
                });

            });

        });

    });

};

// =====================================================
// MANAGE QUEUE -- ACTIONS
// =====================================================

exports.postCallNext = (req, res) => {

    const user_id = req.session.user.user_id;
    const schedule_id = req.body.schedule_id;

    doctorModel.getDoctorByUserId(user_id, (err, doctorResult) => {

        if (err || doctorResult.length === 0) {
            return res.redirect("/doctor/queue?error=1");
        }

        const doctor_id = doctorResult[0].doctor_id;

        doctorQueueModel.getSessionById(schedule_id, doctor_id, (err, sessionResult) => {

            if (err || sessionResult.length === 0) {
                return res.redirect("/doctor/queue?error=1");
            }

            const session = sessionResult[0];

            if (session.queue_paused === "Yes") {
                return res.redirect(`/doctor/queue?schedule=${schedule_id}&error=paused`);
            }

            doctorQueueModel.getCurrentServing(schedule_id, (err, servingResult) => {

                if (err) {
                    return res.redirect(`/doctor/queue?schedule=${schedule_id}&error=1`);
                }

                if (servingResult.length > 0) {
                    return res.redirect(`/doctor/queue?schedule=${schedule_id}&error=busy`);
                }

                doctorQueueModel.getNextWaiting(schedule_id, (err, waitingResult) => {

                    if (err) {
                        return res.redirect(`/doctor/queue?schedule=${schedule_id}&error=1`);
                    }

                    if (waitingResult.length === 0) {
                        return res.redirect(`/doctor/queue?schedule=${schedule_id}&error=empty`);
                    }

                    const queue_id = waitingResult[0].queue_id;

                    doctorQueueModel.markServing(queue_id, doctor_id, (err) => {

                        if (err) {
                            console.log(err);
                            return res.redirect(`/doctor/queue?schedule=${schedule_id}&error=1`);
                        }

                        notificationModel.getQueuePatientTarget(queue_id, (targetErr, targets) => {

                            if (targetErr || targets.length === 0) {
                                if (targetErr) console.log("Queue notification lookup error:", targetErr);
                                return res.redirect(`/doctor/queue?schedule=${schedule_id}&success=called`);
                            }

                            const q = targets[0];
                            const message = `Your queue number ${q.queue_number} is now being served by ${q.doctor_name} at ${q.clinic_name}. Please proceed to the consultation area.`;

                            notificationModel.createNotificationsForUsers([q.patient_user_id], "Your Turn — Now Serving", message, "Queue", (notifErr) => {
                                if (notifErr) console.log("Patient queue notification error:", notifErr);
                                return res.redirect(`/doctor/queue?schedule=${schedule_id}&success=called`);
                            });

                        });

                    });

                });

            });

        });

    });

};

exports.postMarkCompleted = (req, res) => {

    const user_id = req.session.user.user_id;
    const queue_id = req.params.queue_id;
    const schedule_id = req.body.schedule_id;

    doctorModel.getDoctorByUserId(user_id, (err, doctorResult) => {

        if (err || doctorResult.length === 0) {
            return res.redirect("/doctor/queue?error=1");
        }

        const doctor_id = doctorResult[0].doctor_id;

        doctorQueueModel.markCompleted(queue_id, doctor_id, (err, result) => {

            if (err || result.affectedRows === 0) {
                console.log(err);
                return res.redirect(`/doctor/queue?schedule=${schedule_id}&error=1`);
            }

            notificationModel.getQueuePatientTarget(queue_id, (targetErr, targets) => {

                if (targetErr || targets.length === 0) {
                    if (targetErr) console.log("Queue notification lookup error:", targetErr);
                    return res.redirect(`/doctor/queue?schedule=${schedule_id}&success=completed`);
                }

                const q = targets[0];
                const message = `Your appointment with ${q.doctor_name} at ${q.clinic_name} has been completed.`;

                notificationModel.createNotificationsForUsers([q.patient_user_id], "Appointment Completed", message, "Queue", (notifErr) => {
                    if (notifErr) console.log("Patient completion notification error:", notifErr);
                    return res.redirect(`/doctor/queue?schedule=${schedule_id}&success=completed`);
                });

            });

        });

    });

};

exports.postSkipPatient = (req, res) => {

    const user_id = req.session.user.user_id;
    const queue_id = req.params.queue_id;
    const schedule_id = req.body.schedule_id;

    doctorModel.getDoctorByUserId(user_id, (err, doctorResult) => {

        if (err || doctorResult.length === 0) {
            return res.redirect("/doctor/queue?error=1");
        }

        const doctor_id = doctorResult[0].doctor_id;

        doctorQueueModel.markSkipped(queue_id, doctor_id, (err, result) => {

            if (err || result.affectedRows === 0) {
                console.log(err);
                return res.redirect(`/doctor/queue?schedule=${schedule_id}&error=1`);
            }

            notificationModel.getQueuePatientTarget(queue_id, (targetErr, targets) => {

                if (targetErr || targets.length === 0) {
                    if (targetErr) console.log("Queue notification lookup error:", targetErr);
                    return res.redirect(`/doctor/queue?schedule=${schedule_id}&success=skipped`);
                }

                const q = targets[0];
                const message = `Your queue entry ${q.queue_number} was skipped by the doctor. Please contact reception if you still need assistance.`;

                notificationModel.createNotificationsForUsers([q.patient_user_id], "Queue Entry Skipped", message, "Queue", (notifErr) => {
                    if (notifErr) console.log("Patient skip notification error:", notifErr);
                    return res.redirect(`/doctor/queue?schedule=${schedule_id}&success=skipped`);
                });

            });

        });

    });

};

exports.postPauseQueue = (req, res) => {

    const user_id = req.session.user.user_id;
    const schedule_id = req.body.schedule_id;

    doctorModel.getDoctorByUserId(user_id, (err, doctorResult) => {

        if (err || doctorResult.length === 0) {
            return res.redirect("/doctor/queue?error=1");
        }

        const doctor_id = doctorResult[0].doctor_id;

        doctorQueueModel.setQueuePaused(schedule_id, doctor_id, "Yes", (err, result) => {

            if (err || result.affectedRows === 0) {
                console.log(err);
                return res.redirect(`/doctor/queue?schedule=${schedule_id}&error=1`);
            }

            return res.redirect(`/doctor/queue?schedule=${schedule_id}&success=paused`);

        });

    });

};

exports.postResumeQueue = (req, res) => {

    const user_id = req.session.user.user_id;
    const schedule_id = req.body.schedule_id;

    doctorModel.getDoctorByUserId(user_id, (err, doctorResult) => {

        if (err || doctorResult.length === 0) {
            return res.redirect("/doctor/queue?error=1");
        }

        const doctor_id = doctorResult[0].doctor_id;

        doctorQueueModel.setQueuePaused(schedule_id, doctor_id, "No", (err, result) => {

            if (err || result.affectedRows === 0) {
                console.log(err);
                return res.redirect(`/doctor/queue?schedule=${schedule_id}&error=1`);
            }

            return res.redirect(`/doctor/queue?schedule=${schedule_id}&success=resumed`);

        });

    });

};

// =====================================================
// PATIENT HISTORY -- LIST
// =====================================================

exports.getPatientHistoryList = (req, res) => {

    const user_id = req.session.user.user_id;

    doctorModel.getDoctorByUserId(user_id, (err, doctorResult) => {

        if (err || doctorResult.length === 0) {

            console.log(err);

            return res.render("doctor/patientHistoryList", {
                currentPage: "patientHistory",
                doctor: null,
                patients: [],
                searchTerm: "",
                errorMsg: "Unable to load your profile right now."
            });

        }

        const doctor = doctorResult[0];
        const doctor_id = doctor.doctor_id;

        const searchTerm = typeof req.query.search === "string" ? req.query.search.trim() : "";

        doctorPatientModel.getPatientsSeenByDoctor(doctor_id, searchTerm, (err, patients) => {

            if (err) {
                console.log(err);
                patients = [];
            }

            let errorMsg = null;
            if (req.query.error === "notfound") {
                errorMsg = "That patient wasn't found in your patient history.";
            }

            res.render("doctor/patientHistoryList", {
                currentPage: "patientHistory",
                doctor: doctor,
                patients: patients,
                searchTerm: searchTerm,
                errorMsg: errorMsg
            });

        });

    });

};

// =====================================================
// PATIENT HISTORY -- DETAIL
// -----------------------------------------------------
// FIX: now captures the doctor row and passes it to the
// view as `doctor`, since doctorSidebar.ejs reads
// doctor.specialization. Previously this render call
// omitted `doctor` entirely, which is what caused the
// "doctor is not defined" crash.
// =====================================================

exports.getPatientHistoryDetail = (req, res) => {

    const user_id = req.session.user.user_id;
    const patient_id = req.params.patient_id;

    doctorModel.getDoctorByUserId(user_id, (err, doctorResult) => {

        if (err || doctorResult.length === 0) {
            return res.redirect("/doctor/patientHistory?error=notfound");
        }

        const doctor = doctorResult[0];
        const doctor_id = doctor.doctor_id;

        doctorPatientModel.getPatientHistoryWithDoctor(doctor_id, patient_id, (err, history) => {

            if (err) {
                console.log(err);
                return res.redirect("/doctor/patientHistory?error=notfound");
            }

            if (history.length === 0) {
                return res.redirect("/doctor/patientHistory?error=notfound");
            }

            doctorPatientModel.getPatientBasicInfo(patient_id, (err, patientResult) => {

                if (err || patientResult.length === 0) {
                    console.log(err);
                    return res.redirect("/doctor/patientHistory?error=notfound");
                }

                const patient = patientResult[0];

                const completedCount = history.filter((h) => h.appointment_status === "Completed").length;
                const cancelledCount = history.filter((h) => h.appointment_status === "Cancelled").length;

                res.render("doctor/patientHistoryDetail", {
                    currentPage: "patientHistory",
                    doctor: doctor,
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

    });

};

// =====================================================
// PROFILE -- VIEW
// -----------------------------------------------------
// FIX: now also passes `doctor` (the same row as `profile`)
// so doctorSidebar.ejs's doctor.specialization reference
// doesn't crash. `profile` is still what the form fields
// bind to -- `doctor` exists purely for the sidebar/navbar
// partials, matching every other page in this module.
// =====================================================

exports.getProfile = (req, res) => {

    const user_id = req.session.user.user_id;

    doctorModel.getDoctorByUserId(user_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.render("doctor/profile", {
                currentPage: "profile",
                doctor: null,
                profile: null,
                successMsg: null,
                errorMsg: "Unable to load your profile right now.",
                passwordSuccessMsg: null,
                passwordErrorMsg: null
            });

        }

        const doctor = result[0];

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

        res.render("doctor/profile", {
            currentPage: "profile",
            doctor: doctor,
            profile: doctor,
            successMsg: successMsg,
            errorMsg: errorMsg,
            passwordSuccessMsg: passwordSuccessMsg,
            passwordErrorMsg: passwordErrorMsg
        });

    });

};

// =====================================================
// PROFILE -- UPDATE (users + doctors info)
// =====================================================

exports.postUpdateProfile = (req, res) => {

    const user_id = req.session.user.user_id;

    const {
        full_name,
        email,
        phone,
        specialization,
        qualification,
        room_no
    } = req.body;

    if (!full_name || !email || !phone) {

        return res.redirect("/doctor/profile?error=1");

    }

    doctorModel.getDoctorByUserId(user_id, (err, doctorResult) => {

        if (err || doctorResult.length === 0) {

            console.log(err);

            return res.redirect("/doctor/profile?error=1");

        }

        const doctor_id = doctorResult[0].doctor_id;

        profileModel.findEmailUsedByOthers(email, user_id, (err, emailMatches) => {

            if (err) {

                console.log(err);

                return res.redirect("/doctor/profile?error=1");

            }

            if (emailMatches.length > 0) {

                return res.redirect("/doctor/profile?error=email");

            }

            profileModel.updateUserInfo(user_id, { full_name, email, phone }, (err) => {

                if (err) {

                    console.log(err);

                    return res.redirect("/doctor/profile?error=1");

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

                            return res.redirect("/doctor/profile?error=1");

                        }

                        req.session.user.full_name = full_name;
                        req.session.user.email = email;
                        req.session.user.phone = phone;

                        return res.redirect("/doctor/profile?updated=1");

                    }
                );

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

        return res.redirect("/doctor/profile?pwError=1");

    }

    if (newPassword.length < 6) {

        return res.redirect("/doctor/profile?pwError=length");

    }

    if (newPassword !== confirmNewPassword) {

        return res.redirect("/doctor/profile?pwError=confirm");

    }

    profileModel.getPasswordHash(user_id, (err, result) => {

        if (err || result.length === 0) {

            console.log(err);

            return res.redirect("/doctor/profile?pwError=1");

        }

        const currentHash = result[0].password;

        bcrypt.compare(currentPassword, currentHash, (err, isMatch) => {

            if (err) {

                console.log(err);

                return res.redirect("/doctor/profile?pwError=1");

            }

            if (!isMatch) {

                return res.redirect("/doctor/profile?pwError=mismatch");

            }

            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {

                if (err) {

                    console.log(err);

                    return res.redirect("/doctor/profile?pwError=1");

                }

                profileModel.updatePassword(user_id, hashedPassword, (err) => {

                    if (err) {

                        console.log(err);

                        return res.redirect("/doctor/profile?pwError=1");

                    }

                    return res.redirect("/doctor/profile?pwUpdated=1");

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

        return res.redirect("/doctor/profile?imgError=1");

    }

    const newImagePath = "/uploads/profile/" + req.file.filename;

    profileModel.getProfileImagePath(user_id, (err, result) => {

        const oldImagePath = (!err && result.length > 0) ? result[0].profile_image : null;

        profileModel.updateProfileImage(user_id, newImagePath, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/doctor/profile?imgError=1");

            }

            if (oldImagePath) {

                const oldFullPath = path.join(__dirname, "..", "public", oldImagePath);

                fs.unlink(oldFullPath, (unlinkErr) => {
                    if (unlinkErr) console.log("Old profile image cleanup skipped:", unlinkErr.message);
                });

            }

            req.session.user.profile_image = newImagePath;

            return res.redirect("/doctor/profile?imgUpdated=1");

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

            return res.redirect("/doctor/profile?imgError=1");

        }

        const currentImagePath = (result.length > 0) ? result[0].profile_image : null;

        profileModel.deleteProfileImage(user_id, (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/doctor/profile?imgError=1");

            }

            if (currentImagePath) {

                const fullPath = path.join(__dirname, "..", "public", currentImagePath);

                fs.unlink(fullPath, (unlinkErr) => {
                    if (unlinkErr) console.log("Profile image cleanup skipped:", unlinkErr.message);
                });

            }

            req.session.user.profile_image = null;

            return res.redirect("/doctor/profile?imgDeleted=1");

        });

    });

};

// =====================================================
// NOTIFICATIONS -- VIEW
// =====================================================

exports.getNotifications = (req, res) => {

    const user_id = req.session.user.user_id;

    // Load the doctor record because doctorSidebar.ejs
    // uses doctor.specialization.
    doctorModel.getDoctorByUserId(user_id, (doctorErr, doctorResult) => {

        if (doctorErr || doctorResult.length === 0) {

            console.log("Unable to load doctor profile for notifications:", doctorErr);

            return res.render("doctor/notifications", {
                currentPage: "notifications",
                doctor: null,
                notifications: [],
                errorMsg: "Unable to load your profile right now."
            });

        }

        const doctor = doctorResult[0];

        // Now load notifications for the logged-in doctor.
        notificationModel.getNotificationsByUser(user_id, (err, notifications) => {

            if (err) {

                console.log(err);

                return res.render("doctor/notifications", {
                    currentPage: "notifications",
                    doctor: doctor,
                    notifications: [],
                    errorMsg: "Unable to load notifications right now."
                });

            }

            return res.render("doctor/notifications", {
                currentPage: "notifications",
                doctor: doctor,
                notifications: notifications,
                errorMsg: null
            });

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

            return res.redirect("/doctor/notifications");
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

        return res.redirect("/doctor/notifications");
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

            return res.redirect("/doctor/notifications");
        }
    );

};