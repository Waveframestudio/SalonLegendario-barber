-- ==========================================
-- EJECUTAR EN SUPABASE → SQL Editor
-- Corrige error 401 al crear turnos (reservas públicas)
-- ==========================================

-- Políticas de turnos (reservas sin login)
DROP POLICY IF EXISTS "Turnos insertables por cualquiera" ON public.appointments;
DROP POLICY IF EXISTS "Turnos insertables anon" ON public.appointments;
DROP POLICY IF EXISTS "Turnos legibles por cualquiera" ON public.appointments;
DROP POLICY IF EXISTS "Turnos actualizables por cualquiera" ON public.appointments;

CREATE POLICY "Turnos legibles por cualquiera"
  ON public.appointments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Turnos insertables anon"
  ON public.appointments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Turnos actualizables por cualquiera"
  ON public.appointments FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Privilegios de tabla para rol anon
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.appointments TO anon;
GRANT ALL ON public.appointments TO authenticated;

-- Lectura pública de configuración
DROP POLICY IF EXISTS "Servicios legibles por cualquiera" ON public.services;
DROP POLICY IF EXISTS "Disponibilidad legible por cualquiera" ON public.day_availability;
DROP POLICY IF EXISTS "Rangos legibles por cualquiera" ON public.custom_time_ranges;

CREATE POLICY "Servicios legibles por cualquiera"
  ON public.services FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Disponibilidad legible por cualquiera"
  ON public.day_availability FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Rangos legibles por cualquiera"
  ON public.custom_time_ranges FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.day_availability TO anon;
GRANT SELECT ON public.custom_time_ranges TO anon;
