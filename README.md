Flybondi - Escáner de Equipajes (plantilla para Visual Studio Code)

Contenido del ZIP:
- index.html (interfaz local)
- css/style.css
- js/main.js
- config.js (pegar URL del WebApp de Google Apps Script)
- apps_script_code.gs (código para pegar en Google Apps Script y desplegar como Web App)
- README.md (esta documentación)

Instrucciones rápidas:
1) Abrir la carpeta en Visual Studio Code (Archivo -> Abrir carpeta).
2) Ejecutar un servidor local (ej: ext Live Server) o abrir index.html en el navegador.
3) Conecta el lector Honeywell Genesis 7580g en modo "keyboard wedge" (emula teclado).
   - Si no está en ese modo, configura el lector para que al escanear envíe la cadena seguida de ENTER.
4) Añade vuelos usando el formulario (Vuelo, IATA, Fecha, Maletero).
5) En el área de Escaneo, enfoca el cuadro y escanea. Al recibir el valor, la app pedirá confirmación y a qué vuelo asignarlo.
6) Al presionar "Cerrar" en un vuelo se mostrará el resumen y, si configuraste CONFIG.APPS_SCRIPT_WEBHOOK_URL en config.js, la app enviará una petición POST para guardar la fila en Google Sheets.
   - Alternativa: Exportar CSV localmente con el botón "Exportar CSV".

Despliegue en Google Sheets (Apps Script):
1) En Google Drive -> Nuevo -> Más -> Google Apps Script.
2) Pega el contenido de apps_script_code.gs en el editor.
3) Vete a 'Deploy' -> 'New deployment' -> selecciona 'Web app'.
   - Ejecutar como: Tu cuenta
   - Quién tiene acceso: Cualquiera (incluso anónimo)  <-- si quieres evitar OAuth para pruebas.
4) Copia la URL desplegada y pégala en config.js -> CONFIG.APPS_SCRIPT_WEBHOOK_URL.
5) Opcional: Abre la Spreadsheet asociada y verifica que se creen las filas.

Notas y mejoras posibles:
- Autenticación segura: para producción, usa OAuth y acceso restringido en Apps Script.
- Soporte offline: esta versión guarda en localStorage y permite exportar CSV si no hay conexión.
- Detección del lector: el Honeywell Genesis 7580g suele funcionar como teclado; si tu modelo está configurado por USB-HID o Serial, adapta la captura (ej: WebUSB o puerto serie).
- Validaciones adicionales, UI de reporte por vuelo, y PDF de cierre pueden agregarse según necesidades.

¡Listo! Abre la carpeta en VS Code y pruébalo.
