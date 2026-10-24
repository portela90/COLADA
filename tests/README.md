# Pruebas automáticas

Prueban Almacén, Coladas, Inicio y Limpieza con datos de prueba (sin tocar Supabase):
que todo el JavaScript esté bien escrito, que cada pantalla abra sin errores ni se salga del móvil,
y los flujos importantes (apuntar consumo, entrada sin albarán, cambios de horno con tolva y juntas).

- Se ejecutan solas en GitHub Actions (`.github/workflows/pruebas.yml`).
- Los cambios se suben a la rama `dev`; si las pruebas pasan, se publican en `main` (la web).
- En local: `cd tests && npm install && npx playwright test`.
- Los datos de prueba están en `tests/mocks/`.
