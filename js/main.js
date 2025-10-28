// Frontend logic: captura de escaneo por input (keyboard wedge) y asignación a vuelos
(() => {
  // data model stored in localStorage for persistence between runs
  const STORAGE_KEY = 'fb_scanner_v1';
  let state = { flights: [], activeFlightId: null, lastScan: null };

  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState(){ try{ state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || state; }catch(e){ state = state; } }

  // DOM
  const el = {
    flightNumber: document.getElementById('flightNumber'),
    iataCode: document.getElementById('iataCode'),
    flightDate: document.getElementById('flightDate'),
    porterName: document.getElementById('porterName'),
    addFlightBtn: document.getElementById('addFlightBtn'),
    flightsList: document.getElementById('flightsList'),
    scanInput: document.getElementById('scanInput'),
    scannedValue: document.getElementById('scannedValue'),
    lastScanSection: document.getElementById('lastScan'),
    assignFlight: document.getElementById('assignFlight'),
    assignBtn: document.getElementById('assignBtn'),
    discardBtn: document.getElementById('discardBtn'),
    closeFlightBtn: document.getElementById('closeFlightBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    summary: document.getElementById('summary')
  };

  // Helpers
  function uid(){ return 'f_' + Math.random().toString(36).slice(2,9); }

  function renderFlights(){
    el.flightsList.innerHTML = '';
    el.assignFlight.innerHTML = '';
    state.flights.forEach(f => {
      const row = document.createElement('div');
      row.className = 'flight-row';
      const meta = document.createElement('div');
      meta.className = 'flight-meta';
      meta.innerHTML = '<div><strong>'+f.flightNumber+'</strong> • '+f.iata+' • '+f.date+' • '+f.porter+'</div>';
      const actions = document.createElement('div');
      actions.style.display = 'flex'; actions.style.gap='8px';
      const selectBtn = document.createElement('button'); selectBtn.textContent = state.activeFlightId===f.id ? 'Activo' : 'Seleccionar'; selectBtn.onclick = ()=>{ state.activeFlightId = f.id; saveState(); renderFlights(); updateCloseButton(); };
      const closeBtn = document.createElement('button'); closeBtn.textContent = 'Cerrar'; closeBtn.onclick = ()=>{ closeFlight(f.id); };
      actions.appendChild(selectBtn); actions.appendChild(closeBtn);
      row.appendChild(meta); row.appendChild(actions);

      const barcodes = document.createElement('div'); barcodes.className='barcodes';
      (f.barcodes||[]).forEach(code => {
        const chip = document.createElement('div'); chip.className='barcode-chip'; chip.textContent = code;
        barcodes.appendChild(chip);
      });
      row.appendChild(barcodes);
      el.flightsList.appendChild(row);

      // also add to dropdown
      const opt = document.createElement('option'); opt.value = f.id; opt.textContent = f.flightNumber + ' • ' + f.date;
      el.assignFlight.appendChild(opt);
    });
  }

  function updateCloseButton(){
    el.closeFlightBtn.disabled = !state.activeFlightId;
  }

  function addFlight(){
    const flightNumber = el.flightNumber.value.trim();
    const iata = el.iataCode.value.trim().toUpperCase();
    const date = el.flightDate.value || new Date().toISOString().slice(0,10);
    const porter = el.porterName.value.trim();
    if(!flightNumber){ alert('Ingrese número de vuelo'); return; }
    const f = { id: uid(), flightNumber, iata, date, porter, createdAt: new Date().toISOString(), barcodes: [], closed: false };
    state.flights.push(f);
    state.activeFlightId = f.id;
    saveState(); renderFlights(); updateCloseButton();
    // clear form
    el.flightNumber.value=''; el.iataCode.value=''; el.porterName.value='';
  }

  function handleScanDetected(value){
    state.lastScan = value;
    saveState();
    el.scannedValue.textContent = value;
    el.lastScanSection.classList.remove('hidden');
    // set selected flight in dropdown if active
    if(state.activeFlightId) el.assignFlight.value = state.activeFlightId;
    // focus assign button
    el.assignBtn.focus();
  }

  function assignScanToFlight(){
    const flightId = el.assignFlight.value;
    if(!flightId){ alert('Seleccione un vuelo para asignar'); return; }
    const f = state.flights.find(x=>x.id===flightId);
    if(!f){ alert('Vuelo no encontrado'); return; }
    f.barcodes = f.barcodes || [];
    // avoid duplicates
    if(f.barcodes.indexOf(state.lastScan) === -1) f.barcodes.push(state.lastScan);
    saveState(); renderFlights();
    // clear last scan UI
    state.lastScan = null; saveState();
    el.lastScanSection.classList.add('hidden'); el.scannedValue.textContent='';
    el.scanInput.value = '';
    el.scanInput.focus();
  }

  function discardScan(){
    state.lastScan = null; saveState();
    el.lastScanSection.classList.add('hidden'); el.scannedValue.textContent='';
    el.scanInput.value = '';
    el.scanInput.focus();
  }

  function closeFlight(id){
    const idx = state.flights.findIndex(x=>x.id===id);
    if(idx === -1) return;
    const f = state.flights[idx];
    // Show summary
    const html = '<strong>Vuelo:</strong> '+f.flightNumber+' • '+f.iata+' • '+f.date+' • '+f.porter + '<br>' +
                 '<strong>Codigos escaneados:</strong> ' + (f.barcodes && f.barcodes.length ? f.barcodes.join(', ') : 'NINGUNO');
    el.summary.innerHTML = html;
    // send to Google Sheets if configured
    if(typeof CONFIG !== 'undefined' && CONFIG.APPS_SCRIPT_WEBHOOK_URL){
      postToServer(f).then(res=>{
        alert('Vuelo enviado al Google Sheet correctamente.');
      }).catch(err=>{
        console.error(err);
        alert('Error al enviar al servidor: ' + (err && err.message ? err.message : err));
      });
    } else {
      alert('No hay webhook configurado. Revisa config.js para añadir tu URL de Apps Script.');
    }
    // mark closed and remove active if needed
    f.closed = true;
    if(state.activeFlightId === f.id) state.activeFlightId = null;
    saveState(); renderFlights(); updateCloseButton();
  }

  async function postToServer(flight){
    const url = CONFIG.APPS_SCRIPT_WEBHOOK_URL;
    // Create a row array: flight metadata + barcodes as columns side-by-side
    const payload = {
      spreadsheetName: CONFIG.SPREADSHEET_NAME || 'Scans',
      row: [flight.flightNumber, flight.iata, flight.date, flight.porter, new Date().toISOString(), ... (flight.barcodes || [])]
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    return resp.json();
  }

  function exportCsv(){
    // Build CSV with each closed or active flight as a row
    const rows = state.flights.map(f => [f.flightNumber,f.iata,f.date,f.porter, ...(f.barcodes||[])]);
    const csv = rows.map(r => r.map(cell => '"'+String(cell||'').replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download = 'scans_'+(new Date().toISOString().slice(0,10))+'.csv'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  // Capture scanner input: main input already exists.
  function setupScannerCapture(){
    // If Honeywell is in keyboard wedge mode it will type characters and send Enter. We'll listen for Enter in the scanInput.
    el.scanInput.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Enter'){
        const value = el.scanInput.value.trim();
        if(value) handleScanDetected(value);
        ev.preventDefault();
      }
    });

    // Also support global capture if focus lost: keyboard wedge can be global; we attempt to catch fast sequences (optional)
    let buffer = '', lastTime = 0;
    window.addEventListener('keydown', (ev)=>{
      const now = Date.now();
      // Heuristic: scanner types fast. If time since last char > 100ms, clear buffer.
      if(now - lastTime > 100) buffer = '';
      lastTime = now;
      if(ev.key.length === 1) buffer += ev.key;
      if(ev.key === 'Enter'){
        const value = buffer.trim();
        buffer = '';
        if(value){
          // put into scanInput for consistency and show verify UI
          el.scanInput.value = value;
          handleScanDetected(value);
        }
      }
    });
  }

  // Init
  function init(){
    loadState();
    renderFlights();
    updateCloseButton();
    // wire events
    el.addFlightBtn.addEventListener('click', addFlight);
    el.assignBtn.addEventListener('click', assignScanToFlight);
    el.discardBtn.addEventListener('click', discardScan);
    el.closeFlightBtn.addEventListener('click', ()=>{ if(state.activeFlightId) closeFlight(state.activeFlightId); });
    el.exportCsvBtn.addEventListener('click', exportCsv);
    setupScannerCapture();
    // focus scan input by default
    el.scanInput.focus();
  }

  init();
})();
