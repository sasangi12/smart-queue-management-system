const db = require("../config/db");

// ===============================
// Find User By Email
// ===============================

exports.findUserByEmail = (email, callback) => {

    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], callback);

};

// ===============================
// Find Patient By NIC
// ===============================

exports.findPatientByNIC = (nic, callback) => {

    const sql = "SELECT * FROM patients WHERE nic = ?";

    db.query(sql, [nic], callback);

};

// ===============================
// Create User
// ===============================

exports.createUser = (userData, callback) => {

    const sql = `
        INSERT INTO users
        (role_id, full_name, email, phone, password)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, userData, callback);

};

// ===============================
// Create Patient
// ===============================

exports.createPatient = (patientData, callback) => {

    const sql = `
        INSERT INTO patients
        (user_id, nic, gender, dob, address)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, patientData, callback);

};


// ===============================
// Find User by Email with Role
// ===============================

exports.findUserWithRole = (email, callback) => {

    const sql = `
        SELECT users.*, roles.role_name
        FROM users
        INNER JOIN roles
        ON users.role_id = roles.role_id
        WHERE email = ?
    `;

    db.query(sql, [email], callback);

};