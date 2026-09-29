CREATE TABLE `agents_cache` (
	`variant_id` integer NOT NULL,
	`scenario_id` integer NOT NULL,
	`agent_id` text NOT NULL,
	`config_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`variant_id`, `scenario_id`),
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `benchmarks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`repetitions` integer DEFAULT 1 NOT NULL,
	`judge_enabled` integer DEFAULT false NOT NULL,
	`estimated_cost_usd` real,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `judge_scores` (
	`run_id` integer PRIMARY KEY NOT NULL,
	`judge_model` text NOT NULL,
	`relevance` integer NOT NULL,
	`depth` integer NOT NULL,
	`coherence` integer NOT NULL,
	`adherence` integer NOT NULL,
	`rationale` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `llm_options` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`provider` text NOT NULL,
	`input_usd_per_mtok` real NOT NULL,
	`output_usd_per_mtok` real NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pricing_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`usd_per_credit` real NOT NULL,
	`plan` text NOT NULL,
	`agent_usd_per_minute_by_plan` text NOT NULL,
	`speech_rate_by_tts_model` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `run_metrics` (
	`run_id` integer PRIMARY KEY NOT NULL,
	`agent_turns` integer,
	`avg_words_per_response` real,
	`avg_sentence_length` real,
	`readability_grade` real,
	`readability_formula` text,
	`lexical_diversity` real,
	`total_agent_chars` integer,
	`composite_score` real,
	`latency_mean_ms` real,
	`latency_p95_ms` real,
	`llm_input_tokens` integer,
	`llm_output_tokens` integer,
	`credits_used` real,
	`cost_usd` real,
	`cost_source` text,
	`cost_per_minute_usd` real,
	`cost_per_turn_usd` real,
	`voice_cost_usd` real,
	`llm_cost_usd` real,
	`computed_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `run_turns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`index` integer NOT NULL,
	`role` text NOT NULL,
	`message` text NOT NULL,
	`time_in_call_secs` real,
	`llm_ttfb_ms` real,
	`tts_ttfb_ms` real,
	`llm_model` text,
	`llm_input_tokens` integer,
	`llm_output_tokens` integer,
	`llm_price_usd` real,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`benchmark_id` integer,
	`variant_id` integer NOT NULL,
	`scenario_id` integer NOT NULL,
	`repetition` integer DEFAULT 1 NOT NULL,
	`mode` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`agent_id` text,
	`conversation_id` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`wall_clock_ms` integer,
	`duration_secs` real,
	`duration_source` text,
	`no_output` integer DEFAULT false NOT NULL,
	`has_audio` integer DEFAULT false NOT NULL,
	`raw_response` text,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`benchmark_id`) REFERENCES `benchmarks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scenarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`system_prompt` text NOT NULL,
	`first_message` text NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`user_mode` text NOT NULL,
	`persona_prompt` text,
	`scripted_turns` text,
	`max_turns` integer DEFAULT 10 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`llm` text NOT NULL,
	`tts_model` text NOT NULL,
	`voice_id` text NOT NULL,
	`voice_name` text,
	`temperature` real,
	`max_tokens` integer,
	`stability` real,
	`similarity_boost` real,
	`speed` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
