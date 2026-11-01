-- 2026-11-01 · Los cambios de horno que manda Limpieza llegan al Almacén con su motivo y quién los hizo.
--
-- 1) Base colada-mapri (whemhkcrgwyjucpaswrm): alm_consumo_limpieza con 8 parámetros (p_motivo, p_resp).
--    Llama a la de 6 y añade al apunte: motivo (código del Almacén), motOrig (el texto de Limpieza) y resp (quién).
--    Mapeo: Tolva atascada / Tubo dosificador atascado o desgastado → ATASCO · Rota o quemada / Rota o desgastada → ROTURA
--           No calienta o da fallo → FALLO · Fuga o pérdida → FUGA · Desgaste → DESGASTE · Cambio preventivo → PREVENTIVO
--           Desbordamiento de material → OTRO
-- 2) Base limpieza-cie (uddejncrjcyyaxjocbpj): ots_consumo_horno, horno_corregir_material y consumos_horno_reenviar
--    mandan además p_motivo (ots.motivo) y p_resp (nombre del trabajador).
-- Sin borrar nada. Las funciones antiguas (5 y 6 parámetros) siguen.

-- ===== colada-mapri =====
create or replace function public.alm_consumo_limpieza(p_secreto text, p_art text, p_cant numeric, p_nota text, p_id text, p_maq text, p_motivo text, p_resp text)
returns void language plpgsql security definer set search_path to '' as $$
declare v_mes text := to_char(clock_timestamp() at time zone 'Europe/Madrid', 'YYYY-MM'); v_m text; v_extra jsonb := '{}'::jsonb;
begin
  perform public.alm_consumo_limpieza(p_secreto, p_art, p_cant, p_nota, p_id, p_maq);
  v_m := case
    when p_motivo ilike '%atasc%' then 'ATASCO'
    when p_motivo ilike 'rota%' then 'ROTURA'
    when p_motivo ilike '%no calienta%' or p_motivo ilike '%fallo%' then 'FALLO'
    when p_motivo ilike '%fuga%' then 'FUGA'
    when p_motivo ilike 'desgaste%' then 'DESGASTE'
    when p_motivo ilike '%preventivo%' then 'PREVENTIVO'
    when nullif(trim(p_motivo), '') is not null then 'OTRO'
    else null end;
  if v_m is not null then v_extra := v_extra || jsonb_build_object('motivo', v_m, 'motOrig', trim(p_motivo)); end if;
  if nullif(trim(p_resp), '') is not null then v_extra := v_extra || jsonb_build_object('resp', trim(p_resp)); end if;
  if v_extra = '{}'::jsonb then return; end if;
  update public.docs d
     set data = jsonb_set(d.data, '{items}', (
           select jsonb_agg(case when x->>'id' = p_id and x->>'motivo' is null and x->>'resp' is null then x || v_extra else x end order by o)
             from jsonb_array_elements(d.data->'items') with ordinality as t(x, o)))
   where d.col = 'alm_mov' and d.id = v_mes
     and exists (select 1 from jsonb_array_elements(d.data->'items') x where x->>'id' = p_id);
end $$;
grant execute on function public.alm_consumo_limpieza(text, text, numeric, text, text, text, text, text) to anon, authenticated, service_role;

-- ===== limpieza-cie (aplicado con la migración «horno_envia_motivo_y_quien») =====
-- ots_consumo_horno, horno_corregir_material y consumos_horno_reenviar: el body de la llamada a
-- rpc/alm_consumo_limpieza lleva además 'p_motivo' (ots.motivo) y 'p_resp' (trabajadores.nombre / consumos_horno.hecho_por_n).
-- Se completaron a mano los 4 apuntes de octubre que ya habían llegado sin motivo (F55 conexión fase y resistencia: FALLO; F25 cono y junta: PREVENTIVO).

-- ===== limpieza-cie · migración «ots_borrada_quita_consumo_almacen» =====
-- Disparador ots_borrada_quita_consumo (AFTER UPDATE OF borrado ON ots): si se borra una OT ya hecha, llama a
-- rpc/alm_consumo_quitar con cada envio_id de consumos_horno (y con 'lim_<ot>' si era una tarea habitual con consumo)
-- y los marca como anulados. Si la OT se borra antes de terminarla, no había nada en el Almacén.
