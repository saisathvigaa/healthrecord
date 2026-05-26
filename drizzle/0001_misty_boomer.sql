CREATE TABLE `biomarkers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`unit` varchar(50) NOT NULL,
	`referenceMin` varchar(50),
	`referenceMax` varchar(50),
	`referenceText` text,
	`description` text,
	`category` varchar(50) NOT NULL DEFAULT 'general',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `biomarkers_id` PRIMARY KEY(`id`),
	CONSTRAINT `biomarkers_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `readings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reportId` int NOT NULL,
	`biomarkerId` int NOT NULL,
	`value` varchar(100) NOT NULL,
	`status` enum('normal','warning','abnormal','unknown') NOT NULL DEFAULT 'unknown',
	`readingDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `readings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text,
	`reportType` enum('blood','urine','other') NOT NULL DEFAULT 'blood',
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`extractedAt` timestamp,
	`extractionStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`rawExtractedData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
