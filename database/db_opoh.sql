/*
 Navicat Premium Data Transfer

 Source Server         : MySQL Appserv - 127.0.0.1 3306
 Source Server Type    : MySQL
 Source Server Version : 80017 (8.0.17)
 Source Host           : localhost:3306
 Source Schema         : db_opoh

 Target Server Type    : MySQL
 Target Server Version : 80017 (8.0.17)
 File Encoding         : 65001

 Date: 06/07/2026 02:38:48
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for api_keys
-- ----------------------------
DROP TABLE IF EXISTS `api_keys`;
CREATE TABLE `api_keys`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hospital_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `api_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `api_keys_hospital_code_key`(`hospital_code` ASC) USING BTREE,
  UNIQUE INDEX `api_keys_api_key_key`(`api_key` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 23 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of api_keys
-- ----------------------------

-- ----------------------------
-- Table structure for bed_management_summary
-- ----------------------------
DROP TABLE IF EXISTS `bed_management_summary`;
CREATE TABLE `bed_management_summary`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ward_code` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `ward_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `total_bed` int(11) NULL DEFAULT 0,
  `actual_bed` int(11) NULL DEFAULT NULL,
  `occupied_bed` int(11) NULL DEFAULT 0,
  `available_bed` int(11) NULL DEFAULT 0,
  `occupancy_rate` decimal(5, 2) NULL DEFAULT 0.00,
  `export_code` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `last_sync_at` datetime(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `hospital_code` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `is_icu` tinyint(1) NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `bed_management_summary_hospital_code_ward_code_key`(`hospital_code` ASC, `ward_code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1941 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of bed_management_summary
-- ----------------------------

-- ----------------------------
-- Table structure for hospitals
-- ----------------------------
DROP TABLE IF EXISTS `hospitals`;
CREATE TABLE `hospitals`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hospital_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `hospital_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amphur` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `hospitals_hospital_code_key`(`hospital_code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 20 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of hospitals
-- ----------------------------
INSERT INTO `hospitals` VALUES (1, '10709', 'โรงพยาบาลกาฬสินธุ์', 'เมืองกาฬสินธุ์', '2026-06-17 18:23:37.880', '2026-06-17 18:23:37.880');
INSERT INTO `hospitals` VALUES (2, '11077', 'โรงพยาบาลนามน', 'นามน', '2026-06-17 18:23:37.896', '2026-06-17 18:23:37.896');
INSERT INTO `hospitals` VALUES (3, '11078', 'โรงพยาบาลกมลาไสย', 'กมลาไสย', '2026-06-17 18:23:37.904', '2026-06-17 18:23:37.904');
INSERT INTO `hospitals` VALUES (4, '11079', 'โรงพยาบาลร่องคำ', 'ร่องคำ', '2026-06-17 18:23:37.910', '2026-06-17 18:23:37.910');
INSERT INTO `hospitals` VALUES (5, '11080', 'โรงพยาบาลเขาวง', 'เขาวง', '2026-06-17 18:23:37.916', '2026-06-17 18:23:37.916');
INSERT INTO `hospitals` VALUES (6, '11081', 'โรงพยาบาลยางตลาด', 'ยางตลาด', '2026-06-17 18:23:37.921', '2026-06-17 18:23:37.921');
INSERT INTO `hospitals` VALUES (7, '11082', 'โรงพยาบาลห้วยเม็ก', 'ห้วยเม็ก', '2026-06-17 18:23:37.930', '2026-06-17 18:23:37.930');
INSERT INTO `hospitals` VALUES (8, '11083', 'โรงพยาบาลสหัสขันธ์', 'สหัสขันธ์', '2026-06-17 18:23:37.936', '2026-06-17 18:23:37.936');
INSERT INTO `hospitals` VALUES (9, '11084', 'โรงพยาบาลคำม่วง', 'คำม่วง', '2026-06-17 18:23:37.942', '2026-06-17 18:23:37.942');
INSERT INTO `hospitals` VALUES (10, '11085', 'โรงพยาบาลท่าคันโท', 'ท่าคันโท', '2026-06-17 18:23:37.948', '2026-06-17 18:23:37.948');
INSERT INTO `hospitals` VALUES (11, '11086', 'โรงพยาบาลหนองกุงศรี', 'หนองกุงศรี', '2026-06-17 18:23:37.954', '2026-06-17 18:23:37.954');
INSERT INTO `hospitals` VALUES (12, '11087', 'โรงพยาบาลสมเด็จ', 'สมเด็จ', '2026-06-17 18:23:37.960', '2026-06-17 18:23:37.960');
INSERT INTO `hospitals` VALUES (13, '11088', 'โรงพยาบาลห้วยผึ้ง', 'ห้วยผึ้ง', '2026-06-17 18:23:37.966', '2026-06-17 18:23:37.966');
INSERT INTO `hospitals` VALUES (14, '28791', 'โรงพยาบาลสามชัย', 'สามชัย', '2026-06-17 18:23:37.973', '2026-06-17 18:23:37.973');
INSERT INTO `hospitals` VALUES (15, '28017', 'โรงพยาบาลนาคู', 'นาคู', '2026-06-17 18:23:37.980', '2026-06-17 18:23:37.980');
INSERT INTO `hospitals` VALUES (16, '28790', 'โรงพยาบาลดอนจาน', 'ดอนจาน', '2026-06-17 18:23:37.985', '2026-06-17 18:23:37.985');
INSERT INTO `hospitals` VALUES (17, '11449', 'โรงพยาบาลสมเด็จพระยุพราชกุฉินารายณ์', 'กุฉินารายณ์', '2026-06-18 07:51:22.355', '2026-06-18 07:51:22.355');
INSERT INTO `hospitals` VALUES (18, '28789', 'โรงพยาบาลฆ้องชัย', 'ฆ้องชัย', '2026-06-18 07:51:50.212', '2026-06-18 07:51:50.212');
INSERT INTO `hospitals` VALUES (19, '00033', 'สำนักงานสาธารณสุขจังหวัดกาฬสินธุ์', 'เมืองกาฬสินธุ์', '2026-06-18 14:16:07.146', '2026-06-18 14:16:07.146');

-- ----------------------------
-- Table structure for lr_management_summary
-- ----------------------------
DROP TABLE IF EXISTS `lr_management_summary`;
CREATE TABLE `lr_management_summary`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hospital_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `hospital_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `waiting_labor` int(11) NULL DEFAULT 0,
  `normal_delivery` int(11) NULL DEFAULT 0,
  `cesarean_delivery` int(11) NULL DEFAULT 0,
  `abortion` int(11) NULL DEFAULT 0,
  `not_delivery` int(11) NULL DEFAULT 0,
  `total_case` int(11) NULL DEFAULT 0,
  `last_sync_at` datetime(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `lr_management_summary_hospital_code_key`(`hospital_code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 316 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of lr_management_summary
-- ----------------------------

-- ----------------------------
-- Table structure for or_management_summary
-- ----------------------------
DROP TABLE IF EXISTS `or_management_summary`;
CREATE TABLE `or_management_summary`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hospital_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `hospital_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_available_str` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `operating_count` int(11) NULL DEFAULT 0,
  `waiting_count` int(11) NULL DEFAULT 0,
  `completed_count` int(11) NULL DEFAULT 0,
  `cancelled_count` int(11) NULL DEFAULT 0,
  `total_case_today` int(11) NULL DEFAULT 0,
  `last_sync_at` datetime(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `or_management_summary_hospital_code_key`(`hospital_code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 121 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of or_management_summary
-- ----------------------------

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cid` varchar(13) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `phone_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USER',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login_at` datetime(3) NULL DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `hospital_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '00033',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `users_cid_key`(`cid` ASC) USING BTREE,
  UNIQUE INDEX `users_username_key`(`username` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (1, '9999999999999', 'admin', '$2b$10$YPMNVB6K8fODQc6kTG0/Q.y0.7NhmycGy2OO2z9qbZiVhLAdqTYIC', 'ผู้ดูแลระบบ', '', NULL, NULL, 'ADMIN', 1, '2026-07-06 02:23:37.000', '2026-07-06 01:34:34.106', '2026-07-06 01:34:34.000', '00033');

-- ----------------------------
-- Table structure for waiting_or_summary
-- ----------------------------
DROP TABLE IF EXISTS `waiting_or_summary`;
CREATE TABLE `waiting_or_summary`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hospital_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `hospital_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_cases` int(11) NULL DEFAULT 0,
  `general_surgery` int(11) NULL DEFAULT 0,
  `ortho_surgery` int(11) NULL DEFAULT 0,
  `eye_surgery` int(11) NULL DEFAULT 0,
  `obgyn_surgery` int(11) NULL DEFAULT 0,
  `urgency_level_desc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `last_sync_at` datetime(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `waiting_or_summary_hospital_code_key`(`hospital_code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of waiting_or_summary
-- ----------------------------

SET FOREIGN_KEY_CHECKS = 1;
