-- Migration: Add DELETE Policy for admin_notifications table in Supabase
-- Run this script in your Supabase SQL Editor if you want physical deletion of admin notification rows from the database.

-- 1. Create DELETE policy for authenticated admin users
DROP POLICY IF EXISTS "Admins can delete notifications" ON "public"."admin_notifications";

CREATE POLICY "Admins can delete notifications"
ON "public"."admin_notifications"
FOR DELETE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ))
  OR
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.role = 'admin')
  ))
);
