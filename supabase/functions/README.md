Funciones de Supabase (copia de lo desplegado en el proyecto colada-mapri).

- `leer-albaran`: recibe la foto de un albarán y, con Claude (API de Anthropic), devuelve proveedor, albarán, fecha, nave, aleación, coladas, kg y fardos. Necesita el secreto `ANTHROPIC_API_KEY` en Supabase → Edge Functions → Secrets. Opcional: `MODELO_ALBARAN` para cambiar el modelo.
