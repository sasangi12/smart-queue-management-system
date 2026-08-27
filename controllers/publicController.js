const contactModel = require("../models/contactModel");
const homeStatsModel = require("../models/homeStatsModel");
const clinicModel = require("../models/clinicModel");

// =====================================================
// HOMEPAGE -- LIVE STATS + DEPARTMENTS + FEATURED DOCTORS
// -----------------------------------------------------
// 4 independent queries run in parallel via the same
// pending-counter pattern used throughout the dashboards.
// clinicModel.getAllClinics is REUSED as-is (already
// filters to status = 'Active', built for the booking
// pages) -- a deactivated clinic won't show up here either.
// =====================================================

exports.getHome = (req, res) => {

    const stats = {
        totalDoctors: 0,
        patientsServed: 0
    };

    let clinics = [];
    let featuredDoctors = [];

    let pending = 4;

    function checkDone() {

        pending--;

        if (pending === 0) {

            res.render("home/home", {
                currentPage: "home",
                stats: stats,
                clinics: clinics,
                featuredDoctors: featuredDoctors
            });

        }

    }

    homeStatsModel.countTotalDoctors((err, result) => {

        if (!err && result.length > 0) {
            stats.totalDoctors = result[0].total;
        }

        checkDone();

    });

    homeStatsModel.countPatientsServed((err, result) => {

        if (!err && result.length > 0) {
            stats.patientsServed = result[0].total;
        }

        checkDone();

    });

    clinicModel.getAllClinics((err, result) => {

        if (!err) {
            clinics = result;
        }

        checkDone();

    });

    homeStatsModel.getFeaturedDoctors(3, (err, result) => {

        if (!err) {
            featuredDoctors = result;
        }

        checkDone();

    });

};

// =====================================================
// CONTACT PAGE -- VIEW
// -----------------------------------------------------
// Reads ?success=1 / ?error=... from the redirect after
// a form submission and turns them into the banner the
// view displays. Without this, postContact's redirect
// would carry the right query string but the page would
// never actually read it.
// =====================================================

exports.getContact = (req, res) => {

    let errorMsg = null;

    if (req.query.error === "fields") errorMsg = "Please fill in all required fields.";
    if (req.query.error === "email_format") errorMsg = "Please enter a valid email address.";
    if (req.query.error === "1") errorMsg = "Something went wrong sending your message. Please try again.";

    res.render("home/contact", {
        success: req.query.success === "1",
        errorMsg: errorMsg
    });

};

// =====================================================
// CONTACT FORM -- SUBMIT
// -----------------------------------------------------
// This is a PUBLIC route (no login required), so it needs
// its own validation from scratch -- it can't reuse
// anything from authController since there's no account
// involved here at all.
// =====================================================

exports.postContact = (req, res) => {

    const { full_name, email, phone, subject, message, website } = req.body;

    // =============================
    // Honeypot Spam Check
    // -----------------------------
    // "website" is a hidden field real users never see or
    // fill in (hidden via CSS in the form) -- only a bot
    // filling every field blindly would populate it. If
    // it's non-empty, silently pretend success rather than
    // erroring, so the bot doesn't learn its submission was
    // rejected and keep retrying.
    // =============================

    if (website) {

        return res.redirect("/contact?success=1");

    }

    // =============================
    // Required Field Check
    // =============================

    if (!full_name || !email || !subject || !message) {

        return res.redirect("/contact?error=fields");

    }

    // =============================
    // Email Format Check
    // =============================

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        return res.redirect("/contact?error=email_format");

    }

    contactModel.createMessage(
        { full_name, email, phone, subject, message },
        (err) => {

            if (err) {

                console.log(err);

                return res.redirect("/contact?error=1");

            }

            return res.redirect("/contact?success=1");

        }
    );

};