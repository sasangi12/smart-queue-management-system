const multer = require("multer");
const path = require("path");
const fs = require("fs");

// =====================================================
// Profile Image Upload (Multer)
// -----------------------------------------------------
// Stores files on disk at public/uploads/profile/ so they
// are served automatically by the express.static
// middleware already set up in server.js — no extra
// route needed to serve them.
// =====================================================

const uploadDir = path.join(__dirname, "..", "public", "uploads", "profile");

// Make sure the folder exists (won't error if it already does)
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {

        const user_id = req.session.user.user_id;
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = "patient_" + user_id + "_" + Date.now() + ext;

        cb(null, uniqueName);

    }

});

// Only allow real image types, max 2MB
function fileFilter(req, file, cb) {

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("INVALID_FILE_TYPE"));
    }

}

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

// =====================================================
// Exported middleware for the "profileImage" form field.
// Wraps multer's error so a bad upload redirects back to
// the profile page with a friendly message instead of
// crashing the request with an unhandled error.
// =====================================================

exports.uploadProfileImage = (req, res, next) => {

    const singleUpload = upload.single("profileImage");

    singleUpload(req, res, function (err) {

        if (err) {

            console.log(err);

            return res.redirect("/patient/profile?imgError=1");

        }

        next();

    });

};
