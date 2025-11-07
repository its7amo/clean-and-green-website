CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"user_role" text NOT NULL,
	"user_name" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"entity_name" text,
	"changes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'unread' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_email" text NOT NULL,
	"note" text NOT NULL,
	"created_by" varchar NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text,
	"notes" text,
	"total_bookings" integer DEFAULT 0 NOT NULL,
	"total_quotes" integer DEFAULT 0 NOT NULL,
	"total_invoices" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar NOT NULL,
	"feature" text NOT NULL,
	"actions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" varchar,
	"phone" text NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "job_photos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" varchar NOT NULL,
	"photo_data" text NOT NULL,
	"photo_type" text NOT NULL,
	"uploaded_by_employee_id" varchar,
	"uploaded_by_name" text NOT NULL,
	"caption" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"active" boolean DEFAULT true NOT NULL,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"discount_type" text NOT NULL,
	"discount_value" integer NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_to" timestamp NOT NULL,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "recurring_bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar,
	"service" text NOT NULL,
	"property_size" text NOT NULL,
	"frequency" text NOT NULL,
	"preferred_time_slot" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"next_occurrence" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"assigned_employee_ids" text[],
	"promo_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" varchar,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "service_areas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"zip_codes" text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"description" text,
	"photo_url" text,
	"order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "customer_id" varchar;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "lead_type" text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "completed_date" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "review_email_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "management_token" varchar DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "assigned_employee_ids" text[];--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_method_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancellation_fee_status" text DEFAULT 'not_applicable' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "promo_code" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "discount_amount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "actual_price" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reminder_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reminder_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "follow_up_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "recurring_booking_id" varchar;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "service_areas" text[];--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "social_links" jsonb;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "privacy_policy" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "terms_of_service" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "cancellation_policy" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "promo_banner_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "promo_banner_message" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "stats_counter_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "review_email_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "follow_up_email_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "reminder_email_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "review_email_subject" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "review_email_body" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "follow_up_email_subject" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "follow_up_email_body" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "reminder_email_subject" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "reminder_email_body" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "payment_reminder_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "payment_reminder_3day_subject" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "payment_reminder_3day_body" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "payment_reminder_7day_subject" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "payment_reminder_7day_body" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "payment_reminder_14day_subject" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "payment_reminder_14day_body" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_id" varchar;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_amount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_description" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "review_email_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "last_reminder_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "reminder_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "customer_id" varchar;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_permissions" ADD CONSTRAINT "employee_permissions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_uploaded_by_employee_id_employees_id_fk" FOREIGN KEY ("uploaded_by_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bookings" ADD CONSTRAINT "recurring_bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;