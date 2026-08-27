// ============================================
// Check if User is Logged In
// ============================================

exports.isLoggedIn = (req, res, next) => {

    if (!req.session.user) {

        return res.redirect("/login");

    }

    next();

};

// ============================================
// Admin Only
// ============================================

exports.isAdmin = (req, res, next) => {

    if (
        req.session.user &&
        req.session.user.role_name === "Admin"
    ) {

        return next();

    }

    return res.status(403).send("Access Denied.");

};

// ============================================
// Doctor Only
// ============================================

exports.isDoctor = (req, res, next) => {

    if (
        req.session.user &&
        req.session.user.role_name === "Doctor"
    ) {

        return next();

    }

    return res.status(403).send("Access Denied.");

};

// ============================================
// Receptionist Only
// ============================================

exports.isReceptionist = (req, res, next) => {

    if (
        req.session.user &&
        req.session.user.role_name === "Receptionist"
    ) {

        return next();

    }

    return res.status(403).send("Access Denied.");

};

// ============================================
// Patient Only
// ============================================

exports.isPatient = (req, res, next) => {

    if (
        req.session.user &&
        req.session.user.role_name === "Patient"
    ) {

        return next();

    }

    return res.status(403).send("Access Denied.");

};