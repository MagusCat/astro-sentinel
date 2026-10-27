#!/usr/bin/env bash
# Aplica TODAS las migraciones a un Postgres 17 desechable y corre las pruebas de RPC
# y de concurrencia. No toca la BD real. Requiere Docker.
#   bash supabase/tests/run.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
NAME=sentinel-rpc-tests
psqlq() { docker exec -i "$NAME" psql -U postgres -qtA -v ON_ERROR_STOP=1 "$@"; }

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=test postgres:17-alpine >/dev/null
trap 'docker stop "$NAME" >/dev/null' EXIT
until docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done; sleep 1

echo "== Migraciones"
# pg_cron no existe en la imagen base: supabase-stub.sql lo simula.
{ cat "$DIR/supabase-stub.sql"; for f in "$DIR"/../migrations/*.sql; do sed '/CREATE EXTENSION IF NOT EXISTS pg_cron/d' "$f"; done; } \
  | psqlq >/dev/null 2>&1 || { echo "Las migraciones fallaron"; exit 1; }
echo "ok  $(ls "$DIR"/../migrations/*.sql | wc -l) migraciones aplicadas"

echo "== RPC"
psqlq -f - < "$DIR/rpc-tests.sql" 2>&1 | sed -n 's/^.*NOTICE:  //p'

echo "== Concurrencia: 20 check-in simultáneos en un horario con cupo 3"
psqlq <<'SQL'
INSERT INTO classes (id, name) VALUES ('10000000-0000-0000-0000-000000000001', 'Race');
INSERT INTO class_plans (id, class_id, plan_name, duration_days, price)
  VALUES ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Race', 30, 1);
INSERT INTO class_sessions (id, class_id, weekday, start_time, end_time, capacity)
  VALUES ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 0, '07:00', '08:00', 3);
INSERT INTO clients (id, full_name) SELECT ('20000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'R' || g FROM generate_series(1, 20) g;
INSERT INTO memberships (client_id, class_plan_id, amount_paid, start_date, end_date, status)
  SELECT id, '10000000-0000-0000-0000-000000000002', 1, CURRENT_DATE, CURRENT_DATE + 30, 'active' FROM clients WHERE full_name LIKE 'R%';
SQL
for g in $(seq 1 20); do
  ( psqlq -c "SELECT check_in('20000000-0000-0000-0000-$(printf %012d "$g")', '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b1')" >/dev/null 2>&1 && echo ok || echo rechazado ) &
done | sort | uniq -c
wait
taken=$(psqlq -c "SELECT count(*) FROM attendance WHERE session_id = '10000000-0000-0000-0000-000000000003'")
[ "$taken" = "3" ] && echo "ok  cupo respetado: $taken/3" || { echo "FALLO: $taken asistencias con cupo 3"; exit 1; }
