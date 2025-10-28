// v2 - Frontend logic con verificación manual y opción de auto-asignar al vuelo activo
(() => {
  const STORAGE_KEY = 'fb_scanner_v2';
  let state = { flights: [], activeFlightId: null, lastScan: null, prefs:{ autoAssign:false, autoClear:true } };

  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState(){ try{ state = Object.assign(state, JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}); }catch(e){} }

  const el = {
    flightNumber: document.getElementById('flightNumber'),
    iataCode: document.getElementById('iataCode'),
    flightDate: document.getElementById('flightDate'),
    porterName: document.getElementById('porterName'),
    addFlightBtn: document.getElementById('addFlightBtn'),
    flightsList: document.getElementById('flightsList'),
    scanInput: document.getElementById('scanInput'),
    verifyBtn: document.getElementById('verifyBtn'),
    scannedValue: document.getElementById('scannedValue'),
    lastScanSection: document.getElementById('lastScan'),
    assignFlight: document.getElementById('assignFlight'),
    assignBtn: document.getElementById('assignBtn'),
    discardBtn: document.getElementById('discardBtn'),
    closeFlightBtn: document.getElementById('closeFlightBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    summary: document.getElementById('summary'),
    autoAssignActive: document.getElementById('autoAssignActive'),
    autoClearAfterAssign: document.getElementById('autoClearAfterAssign')
  };

  function uid(){ return 'f_' + Math.random().toString(36).slice(2,9); }

  function toast(msg, ms=1600){
    const t = document.createElement('div'); t.className='toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>{ t.remove(); }, ms);
  }

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

      const opt = document.createElement('option'); opt.value = f.id; opt.textContent = f.flightNumber + ' • ' + f.date;
      el.assignFlight.appendChild(opt);
    });
  }

  function updateCloseButton(){ el.closeFlightBtn.disabled = !state.activeFlightId; }

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
    el.flightNumber.value=''; el.iataCode.value=''; el.porterName.value='';
  }

  function handleScanDetected(value){
    state.lastScan = value; saveState();
    // Si está activo "auto-assign" y hay vuelo activo => asignar directo
    if(state.prefs.autoAssign && state.activeFlightId){
      const f = state.flights.find(x=>x.id===state.activeFlightId);
      if(f){
        f.barcodes = f.barcodes || [];
        if(f.barcodes.indexOf(value) === -1) f.barcodes.push(value);
        saveState(); renderFlights();
        if(state.prefs.autoClear) el.scanInput.value='';
        toast('Asignado a '+f.flightNumber);
        el.scanInput.focus();
        return;
      }
    }
    // Flujo normal: mostrar verificación
    el.scannedValue.textContent = value;
    el.lastScanSection.classList.remove('hidden');
    if(state.activeFlightId) el.assignFlight.value = state.activeFlightId;
    el.assignBtn.focus();
  }

  function assignScanToFlight(){
    const flightId = el.assignFlight.value;
    if(!flightId){ alert('Seleccione un vuelo para asignar'); return; }
    const f = state.flights.find(x=>x.id===flightId);
    if(!f){ alert('Vuelo no encontrado'); return; }
    f.barcodes = f.barcodes || [];
    if(f.barcodes.indexOf(state.lastScan) === -1) f.barcodes.push(state.lastScan);
    saveState(); renderFlights();
    state.lastScan = null; saveState();
    el.lastScanSection.classList.add('hidden'); el.scannedValue.textContent='';
    if(state.prefs.autoClear) el.scanInput.value = '';
    toast('Guardado');
    el.scanInput.focus();
  }

  function discardScan(){
    state.lastScan = null; saveState();
    el.lastScanSection.classList.add('hidden'); el.scannedValue.textContent='';
    if(state.prefs.autoClear) el.scanInput.value = '';
    el.scanInput.focus();
  }

  function closeFlight(id){
    const idx = state.flights.findIndex(x=>x.id===id);
    if(idx === -1) return;
    const f = state.flights[idx];
    const html = '<strong>Vuelo:</strong> '+f.flightNumber+' • '+f.iata+' • '+f.date+' • '+f.porter + '<br>' +
                 '<strong>Códigos escaneados:</strong> ' + (f.barcodes && f.barcodes.length ? f.barcodes.join(', ') : 'NINGUNO');
    el.summary.innerHTML = html;
    if(typeof CONFIG !== 'undefined' && CONFIG.APPS_SCRIPT_WEBHOOK_URL){
      postToServer(f).then(()=>{ toast('Enviado a Google Sheets'); })
      .catch(err=>{ console.error(err); alert('Error al enviar al servidor: '+(err && err.message ? err.message : err)); });
    } else {
      alert('No hay webhook configurado. Revisa config.js para añadir tu URL de Apps Script.');
    }
    f.closed = true;
    if(state.activeFlightId === f.id) state.activeFlightId = null;
    saveState(); renderFlights(); updateCloseButton();
  }

  async function postToServer(flight){
    const url = CONFIG.APPS_SCRIPT_WEBHOOK_URL;
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
    const rows = state.flights.map(f => [f.flightNumber,f.iata,f.date,f.porter, ...(f.barcodes||[])]);
    const csv = rows.map(r => r.map(cell => '\"'+String(cell||'').replace(/\"/g,'\"\"')+'\"').join(',')).join('\\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download = 'scans_'+(new Date().toISOString().slice(0,10))+'.csv'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  function setupScannerCapture(){
    // ENTER dentro del input
    el.scanInput.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Enter'){
        const value = el.scanInput.value.trim();
        if(value) handleScanDetected(value);
        ev.preventDefault();
      }
    });
    // Botón Verificar para lectores sin ENTER
    el.verifyBtn.addEventListener('click', ()=>{
      const value = el.scanInput.value.trim();
      if(value) handleScanDetected(value);
    });
    // Captura global rápida (teclado wedge)
    let buffer = '', lastTime = 0;
    window.addEventListener('keydown', (ev)=>{
      const now = Date.now();
      if(now - lastTime > 100) buffer = '';
      lastTime = now;
      if(ev.key.length === 1) buffer += ev.key;
      if(ev.key === 'Enter'){
        const value = buffer.trim(); buffer = '';
        if(value){
          el.scanInput.value = value;
          handleScanDetected(value);
        }
      }
    });
  }

  function bindPrefs(){
    el.autoAssignActive.checked = !!state.prefs.autoAssign;
    el.autoClearAfterAssign.checked = !!state.prefs.autoClear;
    el.autoAssignActive.addEventListener('change', ()=>{ state.prefs.autoAssign = el.autoAssignActive.checked; saveState(); });
    el.autoClearAfterAssign.addEventListener('change', ()=>{ state.prefs.autoClear = el.autoClearAfterAssign.checked; saveState(); });
  }

  function init(){
    loadState();
    renderFlights();
    updateCloseButton();
    bindPrefs();
    el.addFlightBtn.addEventListener('click', addFlight);
    el.assignBtn.addEventListener('click', assignScanToFlight);
    el.discardBtn.addEventListener('click', discardScan);
    el.closeFlightBtn.addEventListener('click', ()=>{ if(state.activeFlightId) closeFlight(state.activeFlightId); });
    el.exportCsvBtn.addEventListener('click', exportCsv);
    setupScannerCapture();
    el.scanInput.focus();
  }

  init();
})();
