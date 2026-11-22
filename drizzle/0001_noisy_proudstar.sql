CREATE INDEX `entries_kind_created` ON `entries` (`kind`,`created`);--> statement-breakpoint
CREATE INDEX `entries_owner_kind` ON `entries` (`owner`,`kind`);--> statement-breakpoint
CREATE INDEX `entries_subject_kind_created` ON `entries` (`subject`,`kind`,`created`);