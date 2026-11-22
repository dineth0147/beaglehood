CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`owner` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL
);
