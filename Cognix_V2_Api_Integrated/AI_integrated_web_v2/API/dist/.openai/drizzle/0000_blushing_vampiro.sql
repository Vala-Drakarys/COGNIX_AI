CREATE TABLE `student_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL
);
