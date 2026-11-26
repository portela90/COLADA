-- NO PEGAR TODAVÍA. Para cuando los hornos Westofen estén preparados para sus propios centradores.
--
-- El 26/11/2026, como en la fábrica se ponen centradores Krown en todos los hornos, se cambió:
--  · Limpieza (limpieza-cie): los hornos Westofen 650/900 (F20, F27, F30, F31, F51-F56, F61, F62, F65) descuentan el
--    centrador Krown PCR-32, y el F25 (Westofen 2300) el Krown 1700 PCR-040. El de antes quedó guardado en
--    elementos.recambios.centrador_westofen.
--  · Almacén (colada-mapri): esas máquinas pasaron a los Krown en el catálogo; los Westofen CNT 01-W y CNT 02-W se
--    quedaron sin máquinas (sus máquinas de antes guardadas en el artículo como «inyWestofen»).
-- Este archivo lo deja como estaba. Son dos partes: cada una se pega en su proyecto.

-- ===== 1) En limpieza-cie (uddejncrjcyyaxjocbpj) =====
begin;
update public.elementos e
   set recambios = (e.recambios - 'centrador_westofen') || jsonb_build_object('centrador', e.recambios->>'centrador_westofen')
 where e.recambios ? 'centrador_westofen';
commit;

-- ===== 2) En colada-mapri (whemhkcrgwyjucpaswrm) =====
-- begin;
-- update public.docs d set data = jsonb_set(d.data, '{articulos}', (
--   select jsonb_agg(case
--     when a ? 'inyWestofen' then (a - 'inyWestofen') || jsonb_build_object('iny', a->'inyWestofen')
--     when a->>'id' = 'hr-pcr32' then a || jsonb_build_object('iny', (select jsonb_agg(v) from jsonb_array_elements_text(a->'iny') v
--          where v not in ('F20','F27','F30','F31','F51','F52','F53','F54','F55','F56','F61','F62','F65')))
--     when a->>'id' = 'hr-pcr040' then a || jsonb_build_object('iny', (select jsonb_agg(v) from jsonb_array_elements_text(a->'iny') v where v <> 'F25'))
--     else a end order by o)
--   from jsonb_array_elements(d.data->'articulos') with ordinality t(a, o)))
-- where d.col = 'alm_cat' and d.id = 'app';
-- commit;
