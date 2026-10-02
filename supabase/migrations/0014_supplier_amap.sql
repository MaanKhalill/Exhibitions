-- Amap (Gaode / 高德地图) location for navigation in China: a supplier-provided
-- Amap share link, coordinates, or full address. Google Maps still uses the
-- structured address; this field powers the "open in Amap" option.
alter table public.ex_suppliers add column if not exists amap text not null default '';
