-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: otbl
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `__drizzle_migrations`
--

DROP TABLE IF EXISTS `__drizzle_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `__drizzle_migrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hash` text NOT NULL,
  `created_at` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `__drizzle_migrations`
--

LOCK TABLES `__drizzle_migrations` WRITE;
/*!40000 ALTER TABLE `__drizzle_migrations` DISABLE KEYS */;
INSERT INTO `__drizzle_migrations` VALUES (1,'8f0a259b87bc340a06ae291976e94139748dd4c5cabd2804195706644410e10a',1777030919617);
/*!40000 ALTER TABLE `__drizzle_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bio_oil_zapping`
--

DROP TABLE IF EXISTS `bio_oil_zapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bio_oil_zapping` (
  `id` int NOT NULL AUTO_INCREMENT,
  `site_activity_id` int DEFAULT NULL,
  `work_order_site_id` int NOT NULL,
  `bio_sample_id` int DEFAULT NULL,
  `document_url` varchar(255) DEFAULT NULL,
  `estimated_quantity` decimal(20,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bio_oil_zapping_site_activity_id_site_activity_items_id_fk` (`site_activity_id`),
  KEY `bio_oil_zapping_work_order_site_id_work_order_sites_id_fk` (`work_order_site_id`),
  KEY `bio_oil_zapping_bio_sample_id_bio_samples_id_fk` (`bio_sample_id`),
  CONSTRAINT `bio_oil_zapping_bio_sample_id_bio_samples_id_fk` FOREIGN KEY (`bio_sample_id`) REFERENCES `bio_samples` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bio_oil_zapping_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bio_oil_zapping_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bio_oil_zapping`
--

LOCK TABLES `bio_oil_zapping` WRITE;
/*!40000 ALTER TABLE `bio_oil_zapping` DISABLE KEYS */;
/*!40000 ALTER TABLE `bio_oil_zapping` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bio_samples`
--

DROP TABLE IF EXISTS `bio_samples`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bio_samples` (
  `id` int NOT NULL AUTO_INCREMENT,
  `site_activity_id` int DEFAULT NULL,
  `work_order_site_id` int NOT NULL,
  `biorem_cont_soil_id` int DEFAULT NULL,
  `tph_document_url` varchar(255) NOT NULL,
  `tph_value` decimal(10,2) NOT NULL,
  `application_month` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bio_samples_site_activity_id_site_activity_items_id_fk` (`site_activity_id`),
  KEY `bio_samples_work_order_site_id_work_order_sites_id_fk` (`work_order_site_id`),
  KEY `bio_samples_biorem_cont_soil_id_biorem_cont_soil_id_fk` (`biorem_cont_soil_id`),
  CONSTRAINT `bio_samples_biorem_cont_soil_id_biorem_cont_soil_id_fk` FOREIGN KEY (`biorem_cont_soil_id`) REFERENCES `biorem_cont_soil` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bio_samples_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bio_samples_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bio_samples`
--

LOCK TABLES `bio_samples` WRITE;
/*!40000 ALTER TABLE `bio_samples` DISABLE KEYS */;
/*!40000 ALTER TABLE `bio_samples` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biorem_cont_soil`
--

DROP TABLE IF EXISTS `biorem_cont_soil`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biorem_cont_soil` (
  `id` int NOT NULL AUTO_INCREMENT,
  `site_activity_id` int DEFAULT NULL,
  `work_order_site_id` int NOT NULL,
  `estimated_quantity` decimal(20,2) NOT NULL,
  `amount` decimal(20,2) DEFAULT NULL,
  `transportation_km` decimal(10,2) DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `biorem_cont_soil_site_activity_id_site_activity_items_id_fk` (`site_activity_id`),
  KEY `biorem_cont_soil_work_order_site_id_work_order_sites_id_fk` (`work_order_site_id`),
  CONSTRAINT `biorem_cont_soil_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `biorem_cont_soil_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biorem_cont_soil`
--

LOCK TABLES `biorem_cont_soil` WRITE;
/*!40000 ALTER TABLE `biorem_cont_soil` DISABLE KEYS */;
INSERT INTO `biorem_cont_soil` VALUES (1,1,1,500.00,5900.00,NULL,'estimate_sub-wo','2026-04-24 11:50:47','2026-04-24 11:50:47');
/*!40000 ALTER TABLE `biorem_cont_soil` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clean_soil_area`
--

DROP TABLE IF EXISTS `clean_soil_area`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clean_soil_area` (
  `id` int NOT NULL AUTO_INCREMENT,
  `site_activity_id` int DEFAULT NULL,
  `work_order_site_id` int NOT NULL,
  `estimated_quantity` decimal(20,2) NOT NULL,
  `amount` decimal(20,2) DEFAULT NULL,
  `transportation_km` decimal(10,2) DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `clean_soil_area_site_activity_id_site_activity_items_id_fk` (`site_activity_id`),
  KEY `clean_soil_area_work_order_site_id_work_order_sites_id_fk` (`work_order_site_id`),
  CONSTRAINT `clean_soil_area_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `clean_soil_area_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clean_soil_area`
--

LOCK TABLES `clean_soil_area` WRITE;
/*!40000 ALTER TABLE `clean_soil_area` DISABLE KEYS */;
INSERT INTO `clean_soil_area` VALUES (1,2,2,499.00,5888.20,NULL,'estimate_sub-wo','2026-04-27 05:14:31','2026-05-18 06:38:18');
/*!40000 ALTER TABLE `clean_soil_area` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_contacts`
--

DROP TABLE IF EXISTS `client_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `contact_number` varchar(15) NOT NULL,
  `email` varchar(320) NOT NULL,
  `contact_type` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `client_contacts_client_id_clients_id_fk` (`client_id`),
  CONSTRAINT `client_contacts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_contacts`
--

LOCK TABLES `client_contacts` WRITE;
/*!40000 ALTER TABLE `client_contacts` DISABLE KEYS */;
INSERT INTO `client_contacts` VALUES (1,1,'xyz','Manager','9717310698','prisdfsdfya.s@gmail.com','Primary','2026-05-14 11:29:28','2026-05-14 11:29:28');
/*!40000 ALTER TABLE `client_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `pincode` varchar(10) NOT NULL,
  `gst_number` varchar(15) NOT NULL,
  `contact_number` varchar(15) NOT NULL,
  `email` varchar(320) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (1,'otbl','sadadasdsad','dasdasda','sadas','110023','22AAAAA0000A1Z5','9434343434','sdfsdf@gma.com','active','2026-04-24 11:48:28','2026-04-24 11:48:28');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contractors`
--

DROP TABLE IF EXISTS `contractors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contractors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_number` varchar(15) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `gst_number` varchar(15) DEFAULT NULL,
  `pan_number` varchar(10) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contractor_office_idx` (`office_id`),
  KEY `contractor_name_idx` (`name`),
  CONSTRAINT `contractors_office_id_offices_id_fk` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contractors`
--

LOCK TABLES `contractors` WRITE;
/*!40000 ALTER TABLE `contractors` DISABLE KEYS */;
INSERT INTO `contractors` VALUES (1,1,'werwer','erew',NULL,NULL,'sdfsdfwer',NULL,'active','2026-05-06 08:47:43','2026-05-06 08:47:43');
/*!40000 ALTER TABLE `contractors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `excav_cont_soil`
--

DROP TABLE IF EXISTS `excav_cont_soil`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `excav_cont_soil` (
  `id` int NOT NULL AUTO_INCREMENT,
  `site_activity_id` int DEFAULT NULL,
  `work_order_site_id` int NOT NULL,
  `estimated_quantity` decimal(20,2) NOT NULL,
  `amount` decimal(20,2) DEFAULT NULL,
  `transportation_km` decimal(10,2) DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `excav_cont_soil_site_activity_id_site_activity_items_id_fk` (`site_activity_id`),
  KEY `excav_cont_soil_work_order_site_id_work_order_sites_id_fk` (`work_order_site_id`),
  CONSTRAINT `excav_cont_soil_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `excav_cont_soil_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `excav_cont_soil`
--

LOCK TABLES `excav_cont_soil` WRITE;
/*!40000 ALTER TABLE `excav_cont_soil` DISABLE KEYS */;
/*!40000 ALTER TABLE `excav_cont_soil` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lifting_oil_slush`
--

DROP TABLE IF EXISTS `lifting_oil_slush`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lifting_oil_slush` (
  `id` int NOT NULL AUTO_INCREMENT,
  `site_activity_id` int DEFAULT NULL,
  `work_order_site_id` int NOT NULL,
  `estimated_quantity` decimal(20,2) NOT NULL,
  `amount` decimal(20,2) DEFAULT NULL,
  `transportation_km` decimal(10,2) DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `lifting_oil_slush_site_activity_id_site_activity_items_id_fk` (`site_activity_id`),
  KEY `lifting_oil_slush_work_order_site_id_work_order_sites_id_fk` (`work_order_site_id`),
  CONSTRAINT `lifting_oil_slush_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lifting_oil_slush_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lifting_oil_slush`
--

LOCK TABLES `lifting_oil_slush` WRITE;
/*!40000 ALTER TABLE `lifting_oil_slush` DISABLE KEYS */;
INSERT INTO `lifting_oil_slush` VALUES (1,4,2,323.00,3811.40,NULL,'estimate_sub-wo','2026-04-27 05:14:31','2026-04-27 05:14:31');
/*!40000 ALTER TABLE `lifting_oil_slush` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `office_users`
--

DROP TABLE IF EXISTS `office_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `office_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `office_id` int NOT NULL,
  `assigned_by` int DEFAULT NULL,
  `role` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `office_user_unique_idx` (`office_id`,`user_id`),
  KEY `office_users_assigned_by_users_id_fk` (`assigned_by`),
  KEY `office_user_office_idx` (`office_id`),
  KEY `office_user_user_idx` (`user_id`),
  CONSTRAINT `office_users_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `office_users_office_id_offices_id_fk` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `office_users_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `office_users`
--

LOCK TABLES `office_users` WRITE;
/*!40000 ALTER TABLE `office_users` DISABLE KEYS */;
INSERT INTO `office_users` VALUES (1,3,1,1,'manager','2026-04-24 11:47:33','2026-04-24 11:47:33');
/*!40000 ALTER TABLE `office_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `offices`
--

DROP TABLE IF EXISTS `offices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `gst_number` varchar(15) NOT NULL,
  `pincode` varchar(10) NOT NULL,
  `email` varchar(320) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `name_idx` (`name`),
  KEY `city_idx` (`city`),
  KEY `state_idx` (`state`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `offices`
--

LOCK TABLES `offices` WRITE;
/*!40000 ALTER TABLE `offices` DISABLE KEYS */;
INSERT INTO `offices` VALUES (1,'mehsana','sfdsdf','sdf','sdfsdfsdf','22AAAAA0000A1Z5','232323','sdfsdf@gmadas.com','active','2026-04-24 11:47:33','2026-04-24 11:47:33');
/*!40000 ALTER TABLE `offices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proposals`
--

DROP TABLE IF EXISTS `proposals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proposals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `office_id` int NOT NULL,
  `code` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `document_key` varchar(255) NOT NULL,
  `description` text,
  `proposal_submission_date` timestamp NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `proposals_code_unique` (`code`),
  KEY `proposals_office_id_offices_id_fk` (`office_id`),
  KEY `proposals_created_by_users_id_fk` (`created_by`),
  KEY `proposal_client_idx` (`client_id`),
  KEY `proposal_status_idx` (`status`),
  CONSTRAINT `proposals_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `proposals_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `proposals_office_id_offices_id_fk` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proposals`
--

LOCK TABLES `proposals` WRITE;
/*!40000 ALTER TABLE `proposals` DISABLE KEYS */;
INSERT INTO `proposals` VALUES (1,1,1,'sfsdfsdf','sdfsdf','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQB4f7VjhhsNQrrWxlcjmkxAAStCD3xI9BwamCG31MY-imI','sdfsdf','2026-04-27 18:30:00','pending',NULL,'2026-04-24 11:48:46','2026-04-24 11:48:46');
/*!40000 ALTER TABLE `proposals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refill_excav_soil`
--

DROP TABLE IF EXISTS `refill_excav_soil`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refill_excav_soil` (
  `id` int NOT NULL AUTO_INCREMENT,
  `site_activity_id` int DEFAULT NULL,
  `work_order_site_id` int NOT NULL,
  `estimated_quantity` decimal(20,2) NOT NULL,
  `amount` decimal(20,2) DEFAULT NULL,
  `transportation_km` decimal(10,2) DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `refill_excav_soil_site_activity_id_site_activity_items_id_fk` (`site_activity_id`),
  KEY `refill_excav_soil_work_order_site_id_work_order_sites_id_fk` (`work_order_site_id`),
  CONSTRAINT `refill_excav_soil_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `refill_excav_soil_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refill_excav_soil`
--

LOCK TABLES `refill_excav_soil` WRITE;
/*!40000 ALTER TABLE `refill_excav_soil` DISABLE KEYS */;
INSERT INTO `refill_excav_soil` VALUES (1,3,2,232.00,2737.60,NULL,'estimate_sub-wo','2026-04-27 05:14:31','2026-04-27 05:14:31');
/*!40000 ALTER TABLE `refill_excav_soil` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_of_rates`
--

DROP TABLE IF EXISTS `schedule_of_rates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule_of_rates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `activity` varchar(255) NOT NULL,
  `unit` varchar(10) NOT NULL,
  `estimated_quantity` decimal(20,2) NOT NULL,
  `rc_unit_rate` decimal(20,2) NOT NULL,
  `gst_percentage` decimal(10,2) NOT NULL DEFAULT '18.00',
  `unit_rate_inc_gst` decimal(20,2) NOT NULL,
  `total_cost` decimal(20,2) NOT NULL,
  `transportation_km` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `schedule_of_rates_work_order_id_work_orders_id_fk` (`work_order_id`),
  CONSTRAINT `schedule_of_rates_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_of_rates`
--

LOCK TABLES `schedule_of_rates` WRITE;
/*!40000 ALTER TABLE `schedule_of_rates` DISABLE KEYS */;
INSERT INTO `schedule_of_rates` VALUES (1,1,'clean_soil_area','MT',1000.00,10.00,18.00,11.80,11800.00,0.00,'2026-04-24 11:49:54','2026-04-24 11:49:54'),(2,1,'lifting_oily_slush_or_recovery_of_oil','MT',1000.00,10.00,18.00,11.80,11800.00,0.00,'2026-04-24 11:49:54','2026-04-24 11:49:54'),(3,1,'excavation_oil_contaminated_soil','MT',1000.00,10.00,18.00,11.80,11800.00,0.00,'2026-04-24 11:49:54','2026-04-24 11:49:54'),(4,1,'transportation_contaminated_soil','MT',1000.00,10.00,18.00,11.80,11800.00,0.00,'2026-04-24 11:49:54','2026-04-24 11:49:54'),(5,1,'refilling_excavated_oil_contaminated_soil_land','MT',1000.00,10.00,18.00,11.80,11800.00,0.00,'2026-04-24 11:49:54','2026-04-24 11:49:54'),(6,1,'bioremediation_oil_contaminated_soil','MT',1000.00,10.00,18.00,11.80,11800.00,0.00,'2026-04-24 11:49:54','2026-04-24 11:49:54');
/*!40000 ALTER TABLE `schedule_of_rates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `site_activity_items`
--

DROP TABLE IF EXISTS `site_activity_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_activity_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_site_id` int NOT NULL,
  `schedule_of_rates_id` int NOT NULL,
  `activity` varchar(255) NOT NULL,
  `unit` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `site_activity_items_work_order_site_id_work_order_sites_id_fk` (`work_order_site_id`),
  KEY `site_activity_items_schedule_of_rates_id_schedule_of_rates_id_fk` (`schedule_of_rates_id`),
  CONSTRAINT `site_activity_items_schedule_of_rates_id_schedule_of_rates_id_fk` FOREIGN KEY (`schedule_of_rates_id`) REFERENCES `schedule_of_rates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `site_activity_items_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_activity_items`
--

LOCK TABLES `site_activity_items` WRITE;
/*!40000 ALTER TABLE `site_activity_items` DISABLE KEYS */;
INSERT INTO `site_activity_items` VALUES (1,1,6,'bioremediation_oil_contaminated_soil','MT','2026-04-24 11:50:21','2026-04-24 11:50:21'),(2,2,1,'clean_soil_area','MT','2026-04-27 05:14:02','2026-04-27 05:14:02'),(3,2,5,'refilling_excavated_oil_contaminated_soil_land','MT','2026-04-27 05:14:02','2026-04-27 05:14:02'),(4,2,2,'lifting_oily_slush_or_recovery_of_oil','MT','2026-04-27 05:14:02','2026-04-27 05:14:02'),(5,2,4,'transportation_contaminated_soil','MT','2026-04-27 05:14:02','2026-04-27 05:14:02');
/*!40000 ALTER TABLE `site_activity_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `site_users`
--

DROP TABLE IF EXISTS `site_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_id` int NOT NULL,
  `site_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `site_users_office_id_offices_id_fk` (`office_id`),
  KEY `site_users_site_id_sites_id_fk` (`site_id`),
  KEY `site_users_user_id_users_id_fk` (`user_id`),
  CONSTRAINT `site_users_office_id_offices_id_fk` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `site_users_site_id_sites_id_fk` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON DELETE CASCADE,
  CONSTRAINT `site_users_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_users`
--

LOCK TABLES `site_users` WRITE;
/*!40000 ALTER TABLE `site_users` DISABLE KEYS */;
INSERT INTO `site_users` VALUES (1,1,1,4,'2026-04-24 11:47:44','2026-04-24 11:47:44'),(2,1,1,2,'2026-04-24 11:47:44','2026-04-24 11:47:44'),(3,1,2,4,'2026-05-18 08:29:15','2026-05-18 08:29:15');
/*!40000 ALTER TABLE `site_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sites`
--

DROP TABLE IF EXISTS `sites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `pincode` varchar(10) NOT NULL,
  `office_id` int NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `site_name_idx` (`name`),
  KEY `site_city_idx` (`city`),
  KEY `site_state_idx` (`state`),
  KEY `site_office_idx` (`office_id`),
  CONSTRAINT `sites_office_id_offices_id_fk` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sites`
--

LOCK TABLES `sites` WRITE;
/*!40000 ALTER TABLE `sites` DISABLE KEYS */;
INSERT INTO `sites` VALUES (1,'sdfsdfdsf','sdfsdfsdf','erwrwer','fsdfsdff','334434',1,'active','2026-04-24 11:47:44','2026-04-24 11:47:44'),(2,'ffdfddfd','sdfsdfsdfsdfsdfsdfsdf','sdfsdfsd','fsdfdfsdf','333333',1,'active','2026-04-27 05:14:02','2026-04-27 05:14:02');
/*!40000 ALTER TABLE `sites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trans_cont_soil`
--

DROP TABLE IF EXISTS `trans_cont_soil`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trans_cont_soil` (
  `id` int NOT NULL AUTO_INCREMENT,
  `site_activity_id` int DEFAULT NULL,
  `work_order_site_id` int NOT NULL,
  `estimated_quantity` decimal(20,2) NOT NULL,
  `amount` decimal(20,2) DEFAULT NULL,
  `transportation_km` decimal(10,2) DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `trans_cont_soil_site_activity_id_site_activity_items_id_fk` (`site_activity_id`),
  KEY `trans_cont_soil_work_order_site_id_work_order_sites_id_fk` (`work_order_site_id`),
  CONSTRAINT `trans_cont_soil_site_activity_id_site_activity_items_id_fk` FOREIGN KEY (`site_activity_id`) REFERENCES `site_activity_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trans_cont_soil_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trans_cont_soil`
--

LOCK TABLES `trans_cont_soil` WRITE;
/*!40000 ALTER TABLE `trans_cont_soil` DISABLE KEYS */;
INSERT INTO `trans_cont_soil` VALUES (1,5,2,232.00,2737.60,NULL,'estimate_sub-wo','2026-04-27 05:14:31','2026-04-27 05:14:31');
/*!40000 ALTER TABLE `trans_cont_soil` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(320) NOT NULL,
  `password` varchar(255) NOT NULL,
  `contact_number` varchar(15) DEFAULT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'operator',
  `created_by` int DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `email_idx` (`email`),
  KEY `name_idx` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'rishabh negi','rishabhnegi175@gmail.com','$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q','9717310698','admin',NULL,'active','2026-04-24 11:44:52','2026-04-24 11:44:52'),(2,'rahul singh','rahul.s@gmail.com','$2b$12$IqzsBRu/b6YtWW97daZ8jeyOiioKavlBIRJTSvSQTi.vBIeslWCSO','9872343234','operator',NULL,'active','2026-04-24 11:45:29','2026-04-24 11:45:29'),(3,'ankush semalti','ankush.s@teri.rs.in','$2b$12$UJ9/yaklKiiA.Szk.MfzXOCGlLp9EV0P0EQVoM1HWxRVDOG.Z55re','9717210984','manager',NULL,'active','2026-04-24 11:46:00','2026-04-24 11:46:00'),(4,'manish singh','manish.s@gmail.teri.in','$2b$12$jFvxk5Q2QlybyH0QjEVbK.eGt/2JjlpFjnv0SWySUJCEwa5/ugquG','9343243434','operator',NULL,'active','2026-04-24 11:46:57','2026-04-24 11:46:57');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wo_site_expenses`
--

DROP TABLE IF EXISTS `wo_site_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wo_site_expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_site_id` int NOT NULL,
  `expense_type` varchar(50) NOT NULL,
  `contractor_id` int DEFAULT NULL,
  `description` varchar(500) NOT NULL,
  `amount` decimal(20,2) NOT NULL,
  `expense_date` timestamp NOT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `notes` text,
  `document_url` varchar(500) DEFAULT NULL,
  `document_id` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `activity_key` varchar(100) DEFAULT NULL,
  `quantity` decimal(20,4) DEFAULT NULL,
  `is_exceeded` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `wo_site_expenses_created_by_users_id_fk` (`created_by`),
  KEY `expense_wo_site_idx` (`work_order_site_id`),
  KEY `expense_contractor_idx` (`contractor_id`),
  KEY `expense_type_idx` (`expense_type`),
  KEY `expense_date_idx` (`expense_date`),
  CONSTRAINT `wo_site_expenses_contractor_id_contractors_id_fk` FOREIGN KEY (`contractor_id`) REFERENCES `contractors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `wo_site_expenses_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `wo_site_expenses_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wo_site_expenses`
--

LOCK TABLES `wo_site_expenses` WRITE;
/*!40000 ALTER TABLE `wo_site_expenses` DISABLE KEYS */;
INSERT INTO `wo_site_expenses` VALUES (1,1,'miscellaneous',NULL,'sdfsdf',3232.00,'2026-04-23 18:30:00','asdsad','ada','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQBTN01-XY-vT6iWZA0e9o5zAVysaYvBdcOvLW56GpsQZE8','01MJ6KS72TG5GX4XMPV5H2RFTEBUPPNDTT',1,'2026-04-24 12:14:37','2026-04-24 12:14:37',NULL,NULL,0),(2,2,'miscellaneous',NULL,'fgh',3000.00,'2026-04-29 18:30:00','fdgdg','dfgdf','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDBiW6XEX9nSbK6NYs__4TMAZn7o44wwnY02CQpiU7j6hI','01MJ6KS76BRFXJOEL7M5E3FORVRM777BGM',1,'2026-04-30 06:52:45','2026-04-30 06:52:45','clean_soil_area',200.0000,0),(3,2,'material',NULL,'wwerwe',232.00,'2026-05-03 18:30:00','sdsfdf','sfsf','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDBiW6XEX9nSbK6NYs__4TMAZn7o44wwnY02CQpiU7j6hI','01MJ6KS76BRFXJOEL7M5E3FORVRM777BGM',1,'2026-05-04 05:26:08','2026-05-04 05:26:08','lifting_oily_slush_or_recovery_of_oil',123.0000,0),(4,2,'equipment',NULL,'wwerwe',2343.00,'2026-05-03 18:30:00','sdsfdf','sfsf','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDBiW6XEX9nSbK6NYs__4TMAZn7o44wwnY02CQpiU7j6hI','01MJ6KS76BRFXJOEL7M5E3FORVRM777BGM',1,'2026-05-04 05:26:08','2026-05-04 05:26:08','lifting_oily_slush_or_recovery_of_oil',123.0000,0),(5,2,'equipment',NULL,'wrwerwe',233.00,'2026-05-03 18:30:00','werewr','werwer','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDBiW6XEX9nSbK6NYs__4TMAZn7o44wwnY02CQpiU7j6hI','01MJ6KS76BRFXJOEL7M5E3FORVRM777BGM',1,'2026-05-04 05:27:20','2026-05-04 05:27:20','clean_soil_area',10.0000,0),(6,2,'labour',NULL,'wrwerwe',10.00,'2026-05-03 18:30:00','werewr','werwer','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDBiW6XEX9nSbK6NYs__4TMAZn7o44wwnY02CQpiU7j6hI','01MJ6KS76BRFXJOEL7M5E3FORVRM777BGM',1,'2026-05-04 05:27:20','2026-05-04 05:27:20','clean_soil_area',10.0000,0),(7,2,'labour',NULL,'WWERERE',2313.00,'2026-05-03 18:30:00','sfsdf','sdfsdf','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDBiW6XEX9nSbK6NYs__4TMAZn7o44wwnY02CQpiU7j6hI','01MJ6KS76BRFXJOEL7M5E3FORVRM777BGM',1,'2026-05-04 06:11:10','2026-05-04 06:11:10','refilling_excavated_oil_contaminated_soil_land',40.0000,0),(8,2,'labour',NULL,'WWERERE',2323.00,'2026-05-03 18:30:00','sfsdf','sdfsdf','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDBiW6XEX9nSbK6NYs__4TMAZn7o44wwnY02CQpiU7j6hI','01MJ6KS76BRFXJOEL7M5E3FORVRM777BGM',1,'2026-05-04 06:11:10','2026-05-04 06:11:10','refilling_excavated_oil_contaminated_soil_land',40.0000,0),(9,2,'miscellaneous',NULL,'2323',13123.00,'2026-05-05 18:30:00','1qqe','wqeqw',NULL,NULL,1,'2026-05-06 09:44:13','2026-05-06 09:44:13','clean_soil_area',290.0000,0),(10,2,'miscellaneous',NULL,'sdfsdf',5000.00,'2026-05-13 18:30:00','sdfsdf','sdfsdf','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDBiW6XEX9nSbK6NYs__4TMAZn7o44wwnY02CQpiU7j6hI','01MJ6KS76BRFXJOEL7M5E3FORVRM777BGM',1,'2026-05-14 12:19:05','2026-05-14 12:19:05','transportation_contaminated_soil',100.0000,0),(11,2,'miscellaneous',NULL,'qwewq',2323.00,'2026-05-17 18:30:00','qwe','qweqw','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDBiW6XEX9nSbK6NYs__4TMAZn7o44wwnY02CQpiU7j6hI','01MJ6KS76BRFXJOEL7M5E3FORVRM777BGM',1,'2026-05-18 06:16:05','2026-05-18 06:16:05','clean_soil_area',NULL,1),(12,2,'miscellaneous',NULL,'werwre',234234.00,'2026-05-17 18:30:00','werwer','werwer','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDBiW6XEX9nSbK6NYs__4TMAZn7o44wwnY02CQpiU7j6hI','01MJ6KS76BRFXJOEL7M5E3FORVRM777BGM',1,'2026-05-18 06:52:36','2026-05-18 06:52:36','lifting_oily_slush_or_recovery_of_oil',200.0000,0),(13,2,'labour',NULL,'werwre',343.00,'2026-05-17 18:30:00','werwer','werwer','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDBiW6XEX9nSbK6NYs__4TMAZn7o44wwnY02CQpiU7j6hI','01MJ6KS76BRFXJOEL7M5E3FORVRM777BGM',1,'2026-05-18 06:52:36','2026-05-18 06:52:36','lifting_oily_slush_or_recovery_of_oil',200.0000,0),(14,2,'equipment',NULL,'werwre',3423.00,'2026-05-17 18:30:00','werwer','werwer','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDBiW6XEX9nSbK6NYs__4TMAZn7o44wwnY02CQpiU7j6hI','01MJ6KS76BRFXJOEL7M5E3FORVRM777BGM',1,'2026-05-18 06:52:36','2026-05-18 06:52:36','lifting_oily_slush_or_recovery_of_oil',200.0000,0);
/*!40000 ALTER TABLE `wo_site_expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wo_site_oprtr_docs`
--

DROP TABLE IF EXISTS `wo_site_oprtr_docs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wo_site_oprtr_docs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_site_id` int NOT NULL,
  `uploaded_by_user_id` int NOT NULL,
  `description` text NOT NULL,
  `file_name` varchar(512) DEFAULT NULL,
  `document_url` text NOT NULL,
  `document_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `wosou_wo_site_idx` (`work_order_site_id`),
  KEY `wosou_user_idx` (`uploaded_by_user_id`),
  CONSTRAINT `wo_site_oprtr_docs_uploaded_by_user_id_users_id_fk` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wo_site_oprtr_docs_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wo_site_oprtr_docs`
--

LOCK TABLES `wo_site_oprtr_docs` WRITE;
/*!40000 ALTER TABLE `wo_site_oprtr_docs` DISABLE KEYS */;
INSERT INTO `wo_site_oprtr_docs` VALUES (1,2,4,'asda','sample.pdf','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQD7Rlmo5v8xSYXV2l5P3nm3AVGds9kYf7OiOvVlgkFIse4','01MJ6KS773IZM2RZX7GFEYLVO2LZH546NX','2026-05-18 08:30:12','2026-05-18 08:30:12'),(2,1,4,'tg','sample.pdf','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQCEuQUwsTJBSqHx4vTlsWs8AWLkj2KSmR_uDZbcjmuelow','01MJ6KS74EXECTBMJSIFFKD4PC6TS3C2Z4','2026-05-18 08:30:24','2026-05-18 08:30:24');
/*!40000 ALTER TABLE `wo_site_oprtr_docs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_order_site_docs`
--

DROP TABLE IF EXISTS `work_order_site_docs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_order_site_docs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_site_id` int NOT NULL,
  `document_url` varchar(255) NOT NULL,
  `document_id` varchar(255) DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_order_site_docs_work_order_site_id_work_order_sites_id_fk` (`work_order_site_id`),
  CONSTRAINT `work_order_site_docs_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_order_site_docs`
--

LOCK TABLES `work_order_site_docs` WRITE;
/*!40000 ALTER TABLE `work_order_site_docs` DISABLE KEYS */;
INSERT INTO `work_order_site_docs` VALUES (1,1,'https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQCZtGeGRK0kQLMF4edUHTNfAXdJNoxrL3XGuXpJ-X2PW80',NULL,'sub_wo','2026-04-24 11:50:47','2026-04-24 11:50:47'),(2,1,'https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQCZtGeGRK0kQLMF4edUHTNfAXdJNoxrL3XGuXpJ-X2PW80',NULL,'estimate','2026-04-24 11:50:47','2026-04-24 11:50:47'),(3,2,'https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDqt-t_y8QXRbevZLgUSGr0Aan3_D19doSljyP6QeXFUNE',NULL,'sub_wo','2026-04-27 05:14:31','2026-04-27 05:14:31'),(4,2,'https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDqt-t_y8QXRbevZLgUSGr0Aan3_D19doSljyP6QeXFUNE',NULL,'estimate','2026-04-27 05:14:31','2026-04-27 05:14:31');
/*!40000 ALTER TABLE `work_order_site_docs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_order_site_users`
--

DROP TABLE IF EXISTS `work_order_site_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_order_site_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_site_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `wosu_wo_site_user_idx` (`work_order_site_id`,`user_id`),
  KEY `wosu_user_idx` (`user_id`),
  CONSTRAINT `work_order_site_users_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `work_order_site_users_work_order_site_id_work_order_sites_id_fk` FOREIGN KEY (`work_order_site_id`) REFERENCES `work_order_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_order_site_users`
--

LOCK TABLES `work_order_site_users` WRITE;
/*!40000 ALTER TABLE `work_order_site_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_order_site_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_order_sites`
--

DROP TABLE IF EXISTS `work_order_sites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_order_sites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `client_id` int NOT NULL,
  `site_id` int NOT NULL,
  `date` timestamp NOT NULL,
  `end_date` timestamp NOT NULL,
  `process_type` varchar(50) NOT NULL,
  `job_number` varchar(255) NOT NULL,
  `area` varchar(255) NOT NULL,
  `installation` varchar(255) NOT NULL,
  `joint_estimate_number` varchar(255) NOT NULL,
  `land_owner_name` varchar(255) NOT NULL,
  `remarks` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `isCompleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `wo_site_unique_idx` (`work_order_id`,`site_id`),
  KEY `work_order_sites_client_id_clients_id_fk` (`client_id`),
  KEY `wo_site_work_order_idx` (`work_order_id`),
  KEY `wo_site_site_idx` (`site_id`),
  KEY `wo_site_status_idx` (`status`),
  CONSTRAINT `work_order_sites_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `work_order_sites_site_id_sites_id_fk` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON DELETE CASCADE,
  CONSTRAINT `work_order_sites_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_order_sites`
--

LOCK TABLES `work_order_sites` WRITE;
/*!40000 ALTER TABLE `work_order_sites` DISABLE KEYS */;
INSERT INTO `work_order_sites` VALUES (1,1,1,1,'2026-03-31 18:30:00','2026-04-14 18:30:00','bioremediation','sdfwer2332','fsfsd','fsdfsd','sfsdfs','sdfsdfsdf','sdfsdfs','pending',0,'2026-04-24 11:50:21','2026-04-24 11:50:21'),(2,1,1,2,'2026-04-23 18:30:00','2026-04-29 18:30:00','restoration','2342423ssf','dsfsdf','dsfsfsdf','sfsdff','sdfsdf','sdfsdfsdf','pending',0,'2026-04-27 05:14:02','2026-04-27 05:14:02');
/*!40000 ALTER TABLE `work_order_sites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_orders`
--

DROP TABLE IF EXISTS `work_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL,
  `agreement_number` varchar(255) NOT NULL,
  `rate_contract_number` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `proposal_id` int NOT NULL,
  `client_id` int NOT NULL,
  `office_id` int NOT NULL,
  `start_date` timestamp NOT NULL,
  `end_date` timestamp NOT NULL,
  `handing_over_date` timestamp NOT NULL,
  `document_key` varchar(255) NOT NULL,
  `process_type` varchar(50) NOT NULL,
  `description` text,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `cancellation_reason` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_orders_code_unique` (`code`),
  KEY `work_orders_proposal_id_proposals_id_fk` (`proposal_id`),
  KEY `work_orders_created_by_users_id_fk` (`created_by`),
  KEY `wo_client_idx` (`client_id`),
  KEY `wo_office_idx` (`office_id`),
  KEY `wo_status_idx` (`status`),
  KEY `wo_dates_idx` (`start_date`,`end_date`),
  CONSTRAINT `work_orders_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `work_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `work_orders_office_id_offices_id_fk` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `work_orders_proposal_id_proposals_id_fk` FOREIGN KEY (`proposal_id`) REFERENCES `proposals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_orders`
--

LOCK TABLES `work_orders` WRITE;
/*!40000 ALTER TABLE `work_orders` DISABLE KEYS */;
INSERT INTO `work_orders` VALUES (1,'sdfsdf','343432423234','23423423423','sdfsdf',1,1,1,'2026-04-23 18:30:00','2026-04-26 18:30:00','2026-04-29 18:30:00','https://teriindia.sharepoint.com/:b:/s/OTBLDOC/IQDMyFYru-DcT5zrJk4SUPJ7AdkIv_CQkRFkYmwqECW078A','bioremediation_restoration','sdfsdfsdfs','pending',NULL,1,'2026-04-24 11:49:54','2026-04-24 11:49:54');
/*!40000 ALTER TABLE `work_orders` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-18 15:16:46
