CREATE TABLE `problems` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`difficulty` text NOT NULL,
	`topic` text NOT NULL,
	`title` text NOT NULL,
	`statement` text NOT NULL,
	`function_name` text NOT NULL,
	`parameters` text NOT NULL,
	`return_type` text NOT NULL,
	`reference_solution` text NOT NULL,
	`input_generator` text NOT NULL,
	`sample_tests` text NOT NULL,
	`generator_provider` text NOT NULL,
	`generator_model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`validation_notes` text
);
