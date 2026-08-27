-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 25, 2026 at 07:39 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `smart_queue_management`
--

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `appointment_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `schedule_id` int(11) NOT NULL,
  `appointment_date` date NOT NULL,
  `status` enum('Pending','Confirmed','Completed','Cancelled') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointments`
--

INSERT INTO `appointments` (`appointment_id`, `patient_id`, `schedule_id`, `appointment_date`, `status`, `created_at`) VALUES
(1, 1, 4, '2026-08-02', 'Cancelled', '2026-08-02 10:50:35'),
(2, 1, 11, '2026-08-03', 'Confirmed', '2026-08-02 15:29:17'),
(3, 1, 1, '2026-08-10', 'Confirmed', '2026-08-08 18:16:05'),
(4, 1, 2, '2026-08-24', 'Completed', '2026-08-24 05:20:56'),
(5, 2, 2, '2026-08-24', 'Confirmed', '2026-08-24 05:54:45'),
(6, 1, 16, '2026-08-25', 'Confirmed', '2026-08-24 10:25:53'),
(7, 2, 16, '2026-08-25', 'Confirmed', '2026-08-25 04:19:34'),
(8, 2, 3, '2026-08-28', 'Confirmed', '2026-08-25 04:25:37');

-- --------------------------------------------------------

--
-- Table structure for table `clinics`
--

CREATE TABLE `clinics` (
  `clinic_id` int(11) NOT NULL,
  `clinic_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clinics`
--

INSERT INTO `clinics` (`clinic_id`, `clinic_name`, `description`, `status`) VALUES
(1, 'General Clinic', 'General medical consultation', 'Active'),
(2, 'Dental Clinic', 'Dental treatments and checkups', 'Active'),
(3, 'Eye Clinic', 'Eye examinations and treatments', 'Active'),
(4, 'Pediatric Clinic', 'Child healthcare services', 'Active'),
(5, 'Cardiology Clinic', 'Heart specialist services', 'Active');

-- --------------------------------------------------------

--
-- Table structure for table `contact_messages`
--

CREATE TABLE `contact_messages` (
  `message_id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `subject` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `is_read` enum('Yes','No') NOT NULL DEFAULT 'No',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `contact_messages`
--

INSERT INTO `contact_messages` (`message_id`, `full_name`, `email`, `phone`, `subject`, `message`, `is_read`, `created_at`) VALUES
(1, 'sasangi', 's@gmail.com', '0711111111', 'doctor', 'doctor', 'No', '2026-08-21 10:12:53');

-- --------------------------------------------------------

--
-- Table structure for table `doctors`
--

CREATE TABLE `doctors` (
  `doctor_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `specialization` varchar(100) DEFAULT NULL,
  `qualification` varchar(150) DEFAULT NULL,
  `room_no` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `doctors`
--

INSERT INTO `doctors` (`doctor_id`, `user_id`, `specialization`, `qualification`, `room_no`) VALUES
(6, 8, 'Cardiologist', 'MBBS, MD (Cardiology)', 'C-101'),
(7, 9, 'Dental Surgeon', 'BDS, FCDSSL', 'D-204'),
(8, 10, 'Eye Specialist', 'MBBS, DO (Ophthalmology)', 'E-105'),
(9, 11, 'General Physician', 'MBBS, MD (General Medicine)', 'G-002'),
(10, 12, 'Pediatrician', 'MBBS, MD (Paediatrics)', 'P-310'),
(11, 13, 'Neurologist', 'MBBS, MD (Neurology)', 'N-201');

-- --------------------------------------------------------

--
-- Table structure for table `doctor_schedule`
--

CREATE TABLE `doctor_schedule` (
  `schedule_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `clinic_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `max_patients` int(11) DEFAULT 50,
  `queue_paused` enum('Yes','No') NOT NULL DEFAULT 'No'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `doctor_schedule`
--

INSERT INTO `doctor_schedule` (`schedule_id`, `doctor_id`, `clinic_id`, `date`, `start_time`, `end_time`, `max_patients`, `queue_paused`) VALUES
(1, 6, 5, '2026-08-10', '09:00:00', '12:00:00', 15, 'No'),
(2, 6, 5, '2026-08-25', '09:00:00', '12:00:00', 10, 'No'),
(3, 6, 5, '2026-08-28', '14:00:00', '17:00:00', 10, 'No'),
(4, 7, 2, '2026-08-02', '08:30:00', '11:30:00', 12, 'No'),
(5, 7, 2, '2026-08-04', '13:00:00', '16:00:00', 12, 'No'),
(6, 8, 3, '2026-08-03', '09:00:00', '12:00:00', 8, 'No'),
(7, 8, 3, '2026-08-06', '09:00:00', '12:00:00', 8, 'No'),
(8, 9, 1, '2026-08-02', '08:00:00', '13:00:00', 25, 'No'),
(9, 9, 1, '2026-08-03', '08:00:00', '13:00:00', 25, 'No'),
(10, 9, 1, '2026-08-04', '08:00:00', '13:00:00', 25, 'No'),
(11, 10, 4, '2026-08-03', '10:00:00', '13:00:00', 10, 'No'),
(12, 10, 4, '2026-08-05', '10:00:00', '13:00:00', 10, 'No'),
(13, 7, 2, '2026-08-08', '08:30:00', '11:30:00', 12, 'No'),
(14, 8, 3, '2026-08-16', '09:00:00', '12:00:00', 8, 'No'),
(15, 9, 1, '2026-08-14', '08:00:00', '13:00:00', 25, 'No'),
(16, 10, 4, '2026-08-25', '10:00:00', '13:00:00', 10, 'No');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(150) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `notification_type` varchar(50) DEFAULT NULL,
  `is_read` enum('Yes','No') DEFAULT 'No',
  `sent_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `title`, `message`, `notification_type`, `is_read`, `sent_date`) VALUES
(1, 17, 'Appointment Confirmed', 'Your appointment with Dr. Amanda Perera at Pediatric Clinic on 2026-08-24 (10:00 - 13:00) has been confirmed. Queue number: Q-002, position: 2.', 'Appointment', 'No', '2026-08-25 04:19:34'),
(2, 12, 'New Appointment Booked', 'New appointment booked by madu for Pediatric Clinic on 2026-08-24 (10:00 - 13:00). Queue number: Q-002.', 'Appointment', 'No', '2026-08-25 04:19:34'),
(3, 15, 'New Appointment Booked', 'madu booked an appointment with Dr. Amanda Perera at Pediatric Clinic on 2026-08-24 (10:00 - 13:00). Queue number: Q-002.', 'Appointment', 'No', '2026-08-25 04:19:34'),
(4, 16, 'New Appointment Booked', 'madu booked an appointment with Dr. Amanda Perera at Pediatric Clinic on 2026-08-24 (10:00 - 13:00). Queue number: Q-002.', 'Appointment', 'No', '2026-08-25 04:19:34'),
(5, 17, 'Queue Entry Skipped', 'Your queue entry Q-002 was skipped by the doctor. Please contact reception if you still need assistance.', 'Queue', 'No', '2026-08-25 04:24:07'),
(6, 17, 'Appointment Confirmed', 'Your appointment with Dr. Mary Fernandos at Cardiology Clinic on 2026-08-27 (14:00 - 17:00) has been confirmed. Queue number: Q-001, position: 1.', 'Appointment', 'No', '2026-08-25 04:25:37'),
(7, 8, 'New Appointment Booked', 'New appointment booked by madu for Cardiology Clinic on 2026-08-27 (14:00 - 17:00). Queue number: Q-001.', 'Appointment', 'Yes', '2026-08-25 04:25:37'),
(8, 15, 'New Appointment Booked', 'madu booked an appointment with Dr. Mary Fernandos at Cardiology Clinic on 2026-08-27 (14:00 - 17:00). Queue number: Q-001.', 'Appointment', 'No', '2026-08-25 04:25:37'),
(9, 16, 'New Appointment Booked', 'madu booked an appointment with Dr. Mary Fernandos at Cardiology Clinic on 2026-08-27 (14:00 - 17:00). Queue number: Q-001.', 'Appointment', 'No', '2026-08-25 04:25:37');

-- --------------------------------------------------------

--
-- Table structure for table `patients`
--

CREATE TABLE `patients` (
  `patient_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `nic` varchar(20) DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `patients`
--

INSERT INTO `patients` (`patient_id`, `user_id`, `nic`, `gender`, `dob`, `address`, `created_at`) VALUES
(1, 2, '9886286482', 'Female', '2014-02-17', 'ghadda\r\n', '2026-07-09 09:19:13'),
(2, 17, '7725472', 'Female', '2000-04-04', 'kandy\r\n', '2026-08-24 05:54:28');

-- --------------------------------------------------------

--
-- Table structure for table `queues`
--

CREATE TABLE `queues` (
  `queue_id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `queue_number` varchar(20) NOT NULL,
  `queue_position` int(11) DEFAULT NULL,
  `estimated_wait_time` int(11) DEFAULT NULL,
  `called_time` datetime DEFAULT NULL,
  `priority_type` enum('Normal','Elderly','Pregnant','Disabled','Emergency') DEFAULT 'Normal',
  `queue_status` enum('Waiting','Serving','Completed','Skipped') DEFAULT 'Waiting'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `queues`
--

INSERT INTO `queues` (`queue_id`, `appointment_id`, `queue_number`, `queue_position`, `estimated_wait_time`, `called_time`, `priority_type`, `queue_status`) VALUES
(1, 1, 'Q-001', 1, 10, NULL, 'Normal', 'Skipped'),
(2, 2, 'Q-001', 1, 10, NULL, 'Pregnant', 'Waiting'),
(3, 3, 'Q-001', 1, 10, NULL, 'Normal', 'Waiting'),
(4, 4, 'Q-001', 1, 10, '2026-08-24 10:52:05', 'Normal', 'Completed'),
(5, 5, 'Q-002', 2, 20, NULL, 'Normal', 'Skipped'),
(6, 6, 'Q-001', 1, 10, NULL, 'Pregnant', 'Waiting'),
(7, 7, 'Q-002', 2, 20, NULL, 'Normal', 'Waiting'),
(8, 8, 'Q-001', 1, 10, NULL, 'Elderly', 'Waiting');

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `report_id` int(11) NOT NULL,
  `generated_by` int(11) NOT NULL,
  `report_type` varchar(100) DEFAULT NULL,
  `generated_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`role_id`, `role_name`) VALUES
(1, 'Admin'),
(2, 'Doctor'),
(3, 'Patient'),
(8, 'Receptionist');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `role_id`, `full_name`, `email`, `phone`, `profile_image`, `password`, `status`, `created_at`) VALUES
(2, 3, 'sasangi', 's@gmail.com', '07763176736', '/uploads/profile/patient_2_1785960011824.jfif', '$2b$10$J/BeDDexYbbcXz5Ytxa6NuuTLVkUF3UVG.xxyLnoMVFkXzjpM7vSy', 'Active', '2026-07-09 09:19:13'),
(8, 2, 'Dr. Mary Fernandos', 'mary.fernando@hospital.lk', '0711111111', '/uploads/profile/patient_8_1787307568666.jpg', '$2b$10$17U14gwulGjZ/bqDndDl6.72vokP//g5wrzbs3ZqeQ7M2P4suIT0W', 'Active', '2026-08-02 09:12:22'),
(9, 2, 'Dr. Kasun Silva', 'kasun.silva@hospital.lk', '0712222222', NULL, '$2b$10$L7E9RpQi24/3DMaF9rgl/ukWUKyXB082Gky0ovWtdJfpagD2n7aH2', 'Active', '2026-08-02 09:12:22'),
(10, 2, 'Dr. Shalini Perera', 'shalini.perera@hospital.lk', '0713333333', NULL, '$2b$10$L7E9RpQi24/3DMaF9rgl/ukWUKyXB082Gky0ovWtdJfpagD2n7aH2', 'Inactive', '2026-08-02 09:12:22'),
(11, 2, 'Dr. Nimal Rathnayake', 'nimal.rathnayake@hospital.lk', '0714444444', NULL, '$2b$10$L7E9RpQi24/3DMaF9rgl/ukWUKyXB082Gky0ovWtdJfpagD2n7aH2', 'Inactive', '2026-08-02 09:12:22'),
(12, 2, 'Dr. Amanda Perera', 'amanda.perera@hospital.lk', '0715555555', NULL, '$2b$10$L7E9RpQi24/3DMaF9rgl/ukWUKyXB082Gky0ovWtdJfpagD2n7aH2', 'Active', '2026-08-02 09:12:22'),
(13, 2, 'Dr. New Doctor Name', 'newdoctor@hospital.lk', '0716666666', NULL, '$2b$10$ZXaGVWiN0tQRjJqnbSUtROHtDgcdyZiNi3haROi45Jh/pzy.wZhAi', 'Inactive', '2026-08-08 17:25:11'),
(15, 1, 'System Administrator', 'admin@hospital.com', '0711111111', NULL, '$2b$10$NR11ZRQ9NzVZNBiyVa/b3eyACiJbhxkFpJ9HRi3UsOxQfoEB3E45a', 'Active', '2026-08-20 18:46:10'),
(16, 8, 'sasangi', 'sas@gmail.com', '0711111111', '/uploads/profile/patient_16_1787567708807.webp', '$2b$10$sGgBQXdEfJT4REA6HKgAgeqI2hl9Lpbt9hyG7KpztQVxuOOUd7koe', 'Active', '2026-08-20 18:48:33'),
(17, 3, 'madu', 'm@gmail.com', '0711111111', NULL, '$2b$10$nKUXKlT0I1BIV773DUrYbepnkA3Cio1RkM4daA9sue7Ip2D1UlRGy', 'Active', '2026-08-24 05:54:28');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`appointment_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `schedule_id` (`schedule_id`);

--
-- Indexes for table `clinics`
--
ALTER TABLE `clinics`
  ADD PRIMARY KEY (`clinic_id`);

--
-- Indexes for table `contact_messages`
--
ALTER TABLE `contact_messages`
  ADD PRIMARY KEY (`message_id`);

--
-- Indexes for table `doctors`
--
ALTER TABLE `doctors`
  ADD PRIMARY KEY (`doctor_id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `doctor_schedule`
--
ALTER TABLE `doctor_schedule`
  ADD PRIMARY KEY (`schedule_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `clinic_id` (`clinic_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `patients`
--
ALTER TABLE `patients`
  ADD PRIMARY KEY (`patient_id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `nic` (`nic`);

--
-- Indexes for table `queues`
--
ALTER TABLE `queues`
  ADD PRIMARY KEY (`queue_id`),
  ADD UNIQUE KEY `appointment_id` (`appointment_id`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`report_id`),
  ADD KEY `generated_by` (`generated_by`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `role_name` (`role_name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `role_id` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `appointments`
--
ALTER TABLE `appointments`
  MODIFY `appointment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `clinics`
--
ALTER TABLE `clinics`
  MODIFY `clinic_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `contact_messages`
--
ALTER TABLE `contact_messages`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `doctors`
--
ALTER TABLE `doctors`
  MODIFY `doctor_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `doctor_schedule`
--
ALTER TABLE `doctor_schedule`
  MODIFY `schedule_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `patients`
--
ALTER TABLE `patients`
  MODIFY `patient_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `queues`
--
ALTER TABLE `queues`
  MODIFY `queue_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `report_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  ADD CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`schedule_id`) REFERENCES `doctor_schedule` (`schedule_id`);

--
-- Constraints for table `doctors`
--
ALTER TABLE `doctors`
  ADD CONSTRAINT `doctors_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `doctor_schedule`
--
ALTER TABLE `doctor_schedule`
  ADD CONSTRAINT `doctor_schedule_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`doctor_id`),
  ADD CONSTRAINT `doctor_schedule_ibfk_2` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`clinic_id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `patients`
--
ALTER TABLE `patients`
  ADD CONSTRAINT `patients_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `queues`
--
ALTER TABLE `queues`
  ADD CONSTRAINT `queues_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`appointment_id`);

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`generated_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
