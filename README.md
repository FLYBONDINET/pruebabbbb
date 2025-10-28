Flybondi - Escáner de Equipajes (v2)
--------------------------------------------------
Novedades v2:
- Botón **Verificar escaneo** siempre visible (para lectores sin ENTER).
- Opción **Auto-asignar al vuelo activo** (sin confirmar ni elegir en el combo).
- Opción **Limpiar campo después de asignar**.

Uso:
1) Abrí la carpeta en VS Code y serví `index.html` (Live Server).
2) Creá un vuelo y dejalo activo.
3) Activá **Auto-asignar al vuelo activo** si querés flujo 1-clic.
4) Escaneá: si tenés auto-assign, se guarda directo; si no, se abre la verificación.

Guardar en Google Sheets:
- Pegar la URL del WebApp en `config.js` -> `APPS_SCRIPT_WEBHOOK_URL`.
- `apps_script_code.gs` ya listo para pegar y desplegar.

Notas:
- Evita duplicados dentro del mismo vuelo. Si querés permitirlos, puedo enviarte una variante.
