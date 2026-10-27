-- ============================================================================
-- Horarios semanales, profesores, inscritos por horario y asistencia (check-in).
--
-- Convención de errores: las RPC lanzan con ERRCODE 'SN400' los mensajes pensados
-- para el operador ("Cupo lleno", "Membresía congelada"…). toActionError() los deja
-- pasar tal cual; cualquier otro error de BD sigue ocultándose.
--
-- Concurrencia: check_in y enroll_client bloquean la fila del horario
-- (SELECT … FOR UPDATE), así que dos terminales registrando a la vez en el último
-- cupo se ejecutan en serie y la segunda ve el cupo ya lleno.
-- ============================================================================

-- ── Profesores ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teachers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    text NOT NULL CHECK (length(trim(full_name)) > 0),
  phone_number text,
  email        text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Horario semanal (un registro por franja recurrente) ─────────────────────
CREATE TABLE IF NOT EXISTS public.class_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id  uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  weekday     smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0 = domingo
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  capacity    integer CHECK (capacity IS NULL OR capacity > 0),  -- NULL = sin límite
  access_mode text NOT NULL DEFAULT 'open' CHECK (access_mode IN ('open', 'roster')),
  is_paused   boolean NOT NULL DEFAULT false,
  room        text,
  is_active   boolean NOT NULL DEFAULT true,                      -- borrado lógico
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_sessions_time_ordered CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_class_sessions_weekday ON public.class_sessions (weekday) WHERE is_active;

-- ── Inscritos de un horario (access_mode = 'roster') ────────────────────────
CREATE TABLE IF NOT EXISTS public.session_enrollments (
  session_id uuid NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  client_id  uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, client_id)
);

-- ── Asistencia ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  class_id      uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  session_id    uuid REFERENCES public.class_sessions(id) ON DELETE SET NULL,
  attended_on   date NOT NULL DEFAULT CURRENT_DATE,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  processed_by  uuid REFERENCES public.users(id),
  CONSTRAINT attendance_once_per_day UNIQUE (client_id, class_id, attended_on)
);
CREATE INDEX IF NOT EXISTS idx_attendance_day ON public.attendance (attended_on);
CREATE INDEX IF NOT EXISTS idx_attendance_session_day ON public.attendance (session_id, attended_on);
CREATE INDEX IF NOT EXISTS idx_attendance_client ON public.attendance (client_id, attended_on DESC);

-- ── Deny-all para la API pública; solo el service role (server) accede ──────
ALTER TABLE public.teachers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance          ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.teachers, public.class_sessions, public.session_enrollments, public.attendance
  FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.teachers, public.class_sessions TO service_role;
GRANT SELECT, INSERT, DELETE ON public.session_enrollments, public.attendance TO service_role;

-- ── Check-in atómico ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_in(
  p_client_id  uuid,
  p_class_id   uuid,
  p_session_id uuid,
  p_user_id    uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session class_sessions%ROWTYPE;
  v_taken   integer;
  v_id      uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active) THEN
    RAISE EXCEPTION 'Operador no válido.' USING ERRCODE = 'SN400';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM memberships m
    JOIN class_plans cp ON cp.id = m.class_plan_id
    WHERE m.client_id = p_client_id
      AND cp.class_id = p_class_id
      AND m.status = 'active'
      AND m.start_date <= CURRENT_DATE
      AND m.end_date >= CURRENT_DATE
  ) THEN
    IF EXISTS (
      SELECT 1 FROM memberships m
      JOIN class_plans cp ON cp.id = m.class_plan_id
      WHERE m.client_id = p_client_id AND cp.class_id = p_class_id
        AND m.status = 'frozen' AND m.end_date >= CURRENT_DATE
    ) THEN
      RAISE EXCEPTION 'La membresía del alumno está congelada.' USING ERRCODE = 'SN400';
    END IF;
    RAISE EXCEPTION 'El alumno no tiene una membresía vigente para esta clase.' USING ERRCODE = 'SN400';
  END IF;

  IF p_session_id IS NOT NULL THEN
    -- Serializa los check-in del mismo horario: el conteo y el insert no se intercalan.
    SELECT * INTO v_session FROM class_sessions WHERE id = p_session_id FOR UPDATE;

    IF NOT FOUND OR NOT v_session.is_active OR v_session.class_id <> p_class_id THEN
      RAISE EXCEPTION 'El horario no corresponde a la clase.' USING ERRCODE = 'SN400';
    END IF;
    IF v_session.is_paused THEN
      RAISE EXCEPTION 'Este horario está pausado.' USING ERRCODE = 'SN400';
    END IF;
    IF v_session.access_mode = 'roster' AND NOT EXISTS (
      SELECT 1 FROM session_enrollments WHERE session_id = p_session_id AND client_id = p_client_id
    ) THEN
      RAISE EXCEPTION 'El alumno no está inscrito en este horario.' USING ERRCODE = 'SN400';
    END IF;
    IF v_session.capacity IS NOT NULL THEN
      SELECT count(*) INTO v_taken FROM attendance
       WHERE session_id = p_session_id AND attended_on = CURRENT_DATE;
      IF v_taken >= v_session.capacity THEN
        RAISE EXCEPTION 'Cupo lleno (% alumnos).', v_session.capacity USING ERRCODE = 'SN400';
      END IF;
    END IF;
  END IF;

  INSERT INTO attendance (client_id, class_id, session_id, processed_by)
  VALUES (p_client_id, p_class_id, p_session_id, p_user_id)
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Este alumno ya registró asistencia hoy en esta clase.' USING ERRCODE = 'SN400';
END;
$$;

-- ── Inscripción atómica (la lista no puede superar el cupo) ─────────────────
CREATE OR REPLACE FUNCTION public.enroll_client(p_session_id uuid, p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_capacity integer;
  v_taken    integer;
BEGIN
  SELECT capacity INTO v_capacity FROM class_sessions WHERE id = p_session_id AND is_active FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Horario no encontrado.' USING ERRCODE = 'SN400';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client_id AND is_active) THEN
    RAISE EXCEPTION 'El cliente seleccionado no existe en el sistema.' USING ERRCODE = 'SN400';
  END IF;
  IF EXISTS (SELECT 1 FROM session_enrollments WHERE session_id = p_session_id AND client_id = p_client_id) THEN
    RAISE EXCEPTION 'El alumno ya está inscrito en este horario.' USING ERRCODE = 'SN400';
  END IF;
  IF v_capacity IS NOT NULL THEN
    SELECT count(*) INTO v_taken FROM session_enrollments WHERE session_id = p_session_id;
    IF v_taken >= v_capacity THEN
      RAISE EXCEPTION 'No quedan cupos en este horario (% de %).', v_taken, v_capacity USING ERRCODE = 'SN400';
    END IF;
  END IF;
  INSERT INTO session_enrollments (session_id, client_id) VALUES (p_session_id, p_client_id);
END;
$$;

REVOKE ALL ON FUNCTION public.check_in(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enroll_client(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_in(uuid, uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.enroll_client(uuid, uuid) TO service_role;
