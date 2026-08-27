const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");

// ===================================================
// PATIENT REGISTRATION
// ===================================================

exports.register = (req, res) => {

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

        return res.send("Please fill in all required fields.");

    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        return res.send("Invalid email address.");

    }

    if (password.length < 6) {

        return res.send("Password must be at least 6 characters.");

    }

    if (password !== confirmPassword) {

        return res.send("Passwords do not match.");

    }

    userModel.findUserByEmail(email, (err, emailResult) => {

        if (err) {

            console.log(err);

            return res.send("Database Error.");

        }

        if (emailResult.length > 0) {

            return res.send("Email already exists.");

        }

        userModel.findPatientByNIC(nic, (err, nicResult) => {

            if (err) {

                console.log(err);

                return res.send("Database Error.");

            }

            if (nicResult.length > 0) {

                return res.send("NIC already exists.");

            }

            bcrypt.hash(password, 10, (err, hashedPassword) => {

                if (err) {

                    console.log(err);

                    return res.send("Password encryption failed.");

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

                        return res.send("Failed to create user.");

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

                            return res.send("Failed to create patient.");

                        }

                        console.log("Patient Registered Successfully.");

                        return res.redirect("/login");

                    });

                });

            });

        });

    });
};


// ===================================================
// LOGIN
// ===================================================

exports.login = (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {

        return res.send("Please enter email and password.");

    }

    userModel.findUserWithRole(email, (err, results) => {

        if (err) {

            console.log(err);

            return res.send("Database Error.");

        }

        if (results.length === 0) {

            return res.send("Invalid Email or Password.");

        }

        const user = results[0];

        bcrypt.compare(password, user.password, (err, isMatch) => {

            if (err) {

                console.log(err);

                return res.send("Login Error.");

            }

            if (!isMatch) {

                return res.send("Invalid Email or Password.");

            }

            // =============================
            // Account Status Check
            // -----------------------------
            // Deliberately checked AFTER the password is verified,
            // not before -- checking status first would let someone
            // probing with a wrong password learn whether an email
            // belongs to a deactivated account. Checking after means
            // "wrong password" and "wrong password on a deactivated
            // account" look identical to an attacker; only someone
            // who already knows the correct password ever sees the
            // "deactivated" message.
            //
            // Applies to every role (Admin/Doctor/Patient/
            // Receptionist) since `status` lives on `users`, not on
            // a role-specific table -- so deactivating a doctor via
            // Manage Doctors now actually blocks their login, not
            // just their badge color.
            // =============================

            if (user.status === "Inactive") {

                return res.send("This account has been deactivated. Please contact the hospital administration.");

            }

            // =============================
            // Create Session
            // =============================

            req.session.user = {

                user_id: user.user_id,
                role_id: user.role_id,
                role_name: user.role_name,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                profile_image: user.profile_image || null

            };

            switch (user.role_name) {

                case "Admin":
                    return res.redirect("/admin/dashboard");

                case "Doctor":
                    return res.redirect("/doctor/dashboard");

                case "Receptionist":
                    return res.redirect("/receptionist/dashboard");

                case "Patient":
                    return res.redirect("/patient/dashboard");

                default:
                    return res.send("Invalid User Role.");

            }

        });

    });

};


// ===================================================
// LOGOUT
// ===================================================

exports.logout = (req, res) => {

    req.session.destroy(() => {

        res.redirect("/login");

    });

};