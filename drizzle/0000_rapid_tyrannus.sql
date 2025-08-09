CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"photo_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"location" text,
	"device_info" text
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"background_url" text,
	"updated_at" timestamp with time zone
);
