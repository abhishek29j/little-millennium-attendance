DROP POLICY IF EXISTS "teachers edit today's attendance for assigned class" ON public.attendance;
REVOKE UPDATE ON public.attendance FROM authenticated;