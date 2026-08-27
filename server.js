const express = require("express");
const path = require("path");
const session = require("express-session");

// Routes
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const receptionistRoutes = require("./routes/receptionistRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authMiddleware = require("./middleware/authMiddleware");

// Public pages controller (home/about/contact)
const publicController = require("./controllers/publicController");

const app = express();

// ======================================
// Database Connection
// ======================================

require("./config/db");

// ======================================
// Middleware
// ======================================

// Parse Form Data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(
    session({
        secret: "smart_queue_secret_key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 // 1 Hour
        }
    })
);

// Make logged-in user available in every EJS page
app.use((req, res, next) => {

    res.locals.user = req.session.user || null;

    next();

});

// Static Files
app.use(express.static(path.join(__dirname, "public")));

// ======================================
// View Engine
// ======================================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ======================================
// Public Routes
// ======================================

// Home
app.get("/", publicController.getHome);

// Login
app.get("/login", (req, res) => {
    res.render("home/login");
});

// Register
app.get("/register", (req, res) => {
    res.render("home/register");
});

// About
app.get("/about", (req, res) => {
    res.render("home/about");
});

// Contact
app.get("/contact", publicController.getContact);

// Contact -- form submission (saves to contact_messages)
app.post("/contact", publicController.postContact);

// ======================================
// Authentication Routes
// ======================================

app.use("/", authRoutes);

// =============================
// Admin Routes
// =============================

app.use("/admin", adminRoutes);

// =============================
// Doctor Routes
// =============================

app.use("/doctor", doctorRoutes);

// =============================
// Receptionist Routes
// =============================

app.use("/receptionist", receptionistRoutes);

// =============================
// Patient Routes
// =============================

app.use("/patient", patientRoutes);

// ======================================
// 404 Page
// ======================================

app.use((req, res) => {
    res.status(404).send("404 - Page Not Found");
});

// ======================================
// Server
// ======================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});