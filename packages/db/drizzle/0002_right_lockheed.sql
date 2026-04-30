CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`problem_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`code` text NOT NULL,
	`verdict` text NOT NULL,
	`failed_at_index` integer,
	`failure_note` text,
	`runtime_ms` integer,
	`tests_passed` integer NOT NULL,
	`tests_total` integer NOT NULL,
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE cascade
);
