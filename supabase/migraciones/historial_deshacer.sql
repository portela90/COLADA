-- Historial de cambios (para «↶ Historial» y deshacer): se guarda el estado anterior de cada documento.
create or replace function public.docs_log() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.docs_hist(col,id,data,op) values (new.col,new.id,null,'I');
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.docs_hist(col,id,data,op) values (old.col,old.id,old.data,'D');
    return old;
  else
    if new.data is distinct from old.data then
      insert into public.docs_hist(col,id,data,op) values (old.col,old.id,old.data,'U');
    end if;
    return new;
  end if;
end $$;
create or replace trigger docs_log after insert or update or delete on public.docs
  for each row execute function public.docs_log();
create index if not exists docs_hist_at on public.docs_hist(at);
create index if not exists docs_hist_doc on public.docs_hist(col,id,h);
-- se guardan 60 días de historial
create or replace function public.docs_hist_limpia() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if random() < 0.05 then delete from public.docs_hist where at < now() - interval '60 days'; end if;
  return null;
end $$;
create or replace trigger docs_hist_limpia after insert on public.docs_hist
  for each statement execute function public.docs_hist_limpia();
