# Smart Queue Management System

A web-based clinic queue and appointment management system built with **Node.js, Express.js, EJS, and MariaDB/MySQL**. The system provides separate interfaces and permissions for **patients, doctors, receptionists, and administrators**, allowing appointments and queues to be managed through a centralized platform.

## Repository Name

`smart-queue-management-system`

## Overview

The Smart Queue Management System is designed to reduce waiting-time uncertainty and simplify clinic operations by connecting appointment booking, queue management, patient records, notifications, and administrative functions in one system.

The application follows a server-side MVC-style structure:

- **Routes** handle HTTP endpoints.
- **Controllers** contain application/business logic.
- **Models** communicate with the database.
- **Middleware** handles authentication, authorization, and file uploads.
- **EJS views** provide the web interface.
- **MariaDB/MySQL** stores users, appointments, queues, schedules, clinics, notifications, and reporting data.

## Main Features

### Patient

- Register and log in.
- View the patient dashboard.
- Book appointments by clinic and available doctor schedule.
- View upcoming and previous appointments.
- Cancel appointments.
- Track live queue status.
- View queue number, queue position, estimated waiting time, and current serving status.
- Receive and manage notifications.
- Update profile information and profile photo.
- Change password.

### Doctor

- Access a role-protected doctor dashboard.
- View today's appointments.
- Manage the patient queue.
- Call the next patient.
- Mark patients as completed or skipped.
- Pause and resume a queue.
- View patient history.
- Receive and manage notifications.
- Manage profile information and profile photo.
- Change password.

### Receptionist

- Register patients.
- View appointments across the clinic system.
- Book appointments on behalf of patients.
- Cancel appointments.
- Search patients.
- Retrieve schedules by clinic.
- View the hospital-wide queue overview.
- Manage profile information and notifications.
- Change password.

### Administrator

- Access an admin-only dashboard.
- Manage doctors.
- Manage clinics.
- Manage patients.
- Manage receptionists.
- Activate or deactivate relevant records.
- View system reports.
- Manage notifications.
- Manage administrator profile and password.

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Backend | Express.js |
| Templating | EJS |
| Database | MariaDB / MySQL |
| Database Driver | mysql2 |
| Authentication | Express Session + bcrypt |
| File Uploads | Multer |
| Environment Variables | dotenv |
| Development | Nodemon |
| Frontend | HTML, CSS, JavaScript |

## Project Structure

```text
smart-queue-management-system/
│
├── config/
│   ├── config.js
│   └── db.js
│
├── controllers/
│   ├── adminController.js
│   ├── appointmentController.js
│   ├── authController.js
│   ├── clinicController.js
│   ├── doctorController.js
│   ├── notificationController.js
│   ├── patientController.js
│   ├── publicController.js
│   ├── queueController.js
│   ├── receptionistController.js
│   └── reportController.js
│
├── middleware/
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   └── uploadMiddleware.js
│
├── models/
│   ├── appointmentModel.js
│   ├── clinicModel.js
│   ├── doctorModel.js
│   ├── doctorQueueModel.js
│   ├── notificationModel.js
│   ├── patientModel.js
│   ├── queueModel.js
│   ├── reportModel.js
│   ├── scheduleModel.js
│   ├── userModel.js
│   └── other role-specific models
│
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── doctorRoutes.js
│   ├── patientRoutes.js
│   ├── receptionistRoutes.js
│   └── other application routes
│
├── views/
│   ├── admin/
│   ├── doctor/
│   ├── home/
│   ├── patient/
│   ├── receptionist/
│   ├── layouts/
│   └── partials/
│
├── public/
│   ├── css/
│   ├── js/
│   ├── images/
│   └── uploads/
│
├── package.json
├── package-lock.json
├── server.js
└── smart_queue_management.sql
```

## Database

The project uses a MariaDB/MySQL database named:

```text
smart_queue_management
```

The supplied SQL dump contains tables for:

- `users`
- `roles`
- `patients`
- `doctors`
- `clinics`
- `doctor_schedule`
- `appointments`
- `queues`
- `notifications`
- `reports`
- `contact_messages`

## Prerequisites

Install the following before running the project:

- Node.js and npm
- MariaDB or MySQL Server
- A database management tool such as phpMyAdmin, MySQL Workbench, or the MySQL/MariaDB command line client

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/smart-queue-management-system.git
cd smart-queue-management-system
```

### 2. Install dependencies

```bash
npm install
```

Do **not** commit the `node_modules` directory. It is recreated automatically by `npm install`.

### 3. Create the database

Create a database called:

```sql
CREATE DATABASE smart_queue_management;
```

Import the provided SQL dump:

```bash
mysql -u root -p smart_queue_management < smart_queue_management.sql
```

Alternatively, import the SQL file through phpMyAdmin or another database management application.

### 4. Configure the database connection

The application currently uses the database configuration in `config/db.js`.

Before deployment or sharing the project, move database credentials and other secrets into environment variables. A typical configuration can be represented as:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_queue_management
PORT=3000
SESSION_SECRET=your_secure_session_secret
```

Make sure `.env` is included in `.gitignore` and is **not uploaded to GitHub**.

### 5. Start the application

For normal execution:

```bash
npm start
```

For development with automatic restart:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Application Access

The application provides separate protected areas:

```text
Public pages     /
Admin panel      /admin
Doctor panel     /doctor
Receptionist     /receptionist
Patient panel    /patient
```

Authentication and role-based middleware restrict access to the appropriate panel.

## Queue Management Logic

When an appointment is booked, the system creates a corresponding queue entry. Queue information includes a generated queue number, queue position, priority type, estimated waiting time, and queue status.

The patient queue interface calculates current queue information dynamically. For example, the number of people ahead is recalculated from active waiting entries rather than relying only on the value stored at booking time. This allows the displayed queue position to change as patients are completed or skipped.

Doctors can control the queue by calling the next patient, completing a queue entry, skipping a patient, or temporarily pausing/resuming the queue.

This project is currently intended for academic/development use. Add an appropriate open-source license here if you decide to distribute it under one.

## Author

Developed as a **Smart Queue Management System** web application project.
