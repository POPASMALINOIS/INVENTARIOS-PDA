```javascript
const STORAGE_KEY = 'inventario_pda_expedicion_v4';
const estados = ['Operativa','Operativa con incidencias','No operativa','En reparación','No localizada'];
const acciones = ['Ninguna','Revisar','Reparar','Sustituir batería','Sustituir terminal','Baja'];
const incidencias = ['No enciende','No carga','No tiene conexión','No conecta con AS400','Pantalla rota','Botones dañados','Batería defectuosa','Lector código barras no funciona','Golpes o carcasa rota','Carcasa protectora perdida','Base de carga defectuosa','Otro'];
let data = [];
let selected = null;
function pad(n){return String(n).padStart(3,'0')}
function today(){return new Date().toISOString().slice(0,10)}
function buildInitial(){
  const arr=[];
  for(let i=1;i<=80;i++) arr.push(newPda('CA'+pad(i)));
  for(let i=1;i<=80;i++) arr.push(newPda('EX'+pad(i)));
  return arr;
}
function newPda(codigo){return {codigo, seccion:'Expedición', estado:'Operativa', incidencias:[], accion:'Ninguna', fecha:'', revisadoPor:'', observaciones:''}}
function load(){
  try{ const raw=localStorage.getItem(STORAGE_KEY); data = raw ? JSON.parse(raw) : buildInitial(); }
  catch(e){ data = buildInitial(); }
  if(!Array.isArray(data) || data.length===0) data = buildInitial();
  save();
}
function save(){localStorage.setItem(STORAGE_KEY, JSON.stringify(data));}
function fillSelect(id, values, all){
  const s=document.getElementById(id); s.innerHTML='';
  if(all){ const o=document.createElement('option'); o.value=''; o.textContent=all; s.appendChild(o); }
  values.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; s.appendChild(o); });
}
function fillChecklist(){
  const box=document.getElementById('incChecklist'); box.innerHTML='';
  incidencias.forEach(v=>{
    const label=document.createElement('label'); label.className='checkitem';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.value=v;
    label.appendChild(cb); label.appendChild(document.createTextNode(v)); box.appendChild(label);
  });
}
function initControls(){
  // V4: las opciones van escritas directamente en el HTML para evitar desplegables vacíos al abrir el archivo localmente.
}
function filteredData(){
  const q=document.getElementById('search').value.trim().toUpperCase();
  const fe=document.getElementById('filterEstado').value;
  const fa=document.getElementById('filterAccion').value;
  const vista=document.getElementById('filterVista').value;
  return data.filter(x=>{
    if(q && !x.codigo.toUpperCase().includes(q)) return false;
    if(fe && x.estado!==fe) return false;
    if(fa && x.accion!==fa) return false;
    if(vista==='incidencias' && (!x.incidencias || x.incidencias.length===0)) return false;
    if(vista==='nolocalizadas' && x.estado!=='No localizada') return false;
    if(vista==='reparar' && !(x.accion==='Reparar' || x.estado==='En reparación' || x.estado==='No operativa')) return false;
    return true;
  });
}
function badgeClass(estado){if(estado==='Operativa')return 'ok'; if(estado==='Operativa con incidencias'||estado==='En reparación')return 'warn'; return 'bad'}
function render(){
  renderStats();
  const rows=filteredData(); const tbody=document.getElementById('tbody'); tbody.innerHTML='';
  document.getElementById('empty').classList.toggle('hidden', rows.length>0);
  rows.forEach(x=>{
    const tr=document.createElement('tr'); if(selected===x.codigo) tr.className='active';
    tr.onclick=()=>selectPda(x.codigo);
    tr.innerHTML=`<td><b>${esc(x.codigo)}</b></td><td><span class="badge ${badgeClass(x.estado)}">${esc(x.estado)}</span></td><td>${esc((x.incidencias||[]).join(', ')) || '-'}</td><td>${esc(x.accion)}</td><td>${esc(x.fecha)||'-'}</td><td>${esc(x.revisadoPor)||'-'}</td><td>${esc(x.observaciones)||'-'}</td>`;
    tbody.appendChild(tr);
  });
  if(!selected && data.length) selectPda(data[0].codigo, false);
}
function renderStats(){
  document.getElementById('total').textContent=data.length;
  document.getElementById('incidencias').textContent=data.filter(x=>(x.incidencias||[]).length>0).length;
  document.getElementById('reparar').textContent=data.filter(x=>x.accion==='Reparar'||x.estado==='En reparación'||x.estado==='No operativa').length;
  document.getElementById('nolocalizadas').textContent=data.filter(x=>x.estado==='No localizada').length;
}
function selectPda(codigo, rerender=true){
  selected=codigo; const x=data.find(p=>p.codigo===codigo); if(!x)return;
  document.getElementById('selectedHint').textContent='Editando '+codigo;
  document.getElementById('codigo').value=x.codigo; document.getElementById('seccion').value=x.seccion;
  document.getElementById('estado').value=x.estado; document.getElementById('accion').value=x.accion;
  document.getElementById('fecha').value=x.fecha||''; document.getElementById('revisadoPor').value=x.revisadoPor||''; document.getElementById('observaciones').value=x.observaciones||'';
  document.querySelectorAll('#incChecklist input').forEach(cb=>cb.checked=(x.incidencias||[]).includes(cb.value));
  if(rerender) render();
}
function saveSelected(){
  if(!selected){alert('Selecciona una PDA del listado.');return;}
  const x=data.find(p=>p.codigo===selected); if(!x)return;
  x.estado=document.getElementById('estado').value;
  x.accion=document.getElementById('accion').value;
  x.fecha=document.getElementById('fecha').value || today();
  x.revisadoPor=document.getElementById('revisadoPor').value.trim();
  x.observaciones=document.getElementById('observaciones').value.trim();
  x.incidencias=[...document.querySelectorAll('#incChecklist input:checked')].map(cb=>cb.value);
  if(x.incidencias.length && x.estado==='Operativa') x.estado='Operativa con incidencias';
  save(); render(); selectPda(x.codigo, false);
}
function markOperativa(){
  if(!selected)return alert('Selecciona una PDA.');
  const x=data.find(p=>p.codigo===selected); x.estado='Operativa'; x.accion='Ninguna'; x.incidencias=[]; x.fecha=today(); save(); render(); selectPda(x.codigo,false);
}
function clearIncidencias(){
  if(!selected)return alert('Selecciona una PDA.');
  const x=data.find(p=>p.codigo===selected); x.incidencias=[]; if(x.estado==='Operativa con incidencias') x.estado='Operativa'; if(x.accion==='Reparar') x.accion='Revisar'; x.fecha=today(); save(); render(); selectPda(x.codigo,false);
}
function clearFilters(){document.getElementById('search').value='';document.getElementById('filterEstado').value='';document.getElementById('filterAccion').value='';document.getElementById('filterVista').value='todas';render();}
function setVista(v){document.getElementById('filterVista').value=v;render();}
function resetDemo(){ if(confirm('Esto restaurará el listado inicial CA001-CA080 y EX001-EX080 y borrará los cambios guardados.')){data=buildInitial(); selected=null; save(); clearFilters();}}
function exportExcel(){
  const rows=filteredData();
  let html='<table><tr><th>Codigo PDA</th><th>Seccion</th><th>Estado operativo</th><th>Incidencias detectadas</th><th>Accion requerida</th><th>Fecha ultima revision</th><th>Revisado por</th><th>Observaciones</th></tr>';
  rows.forEach(x=>{html+=`<tr><td>${esc(x.codigo)}</td><td>${esc(x.seccion)}</td><td>${esc(x.estado)}</td><td>${esc((x.incidencias||[]).join(', '))}</td><td>${esc(x.accion)}</td><td>${esc(x.fecha)}</td><td>${esc(x.revisadoPor)}</td><td>${esc(x.observaciones)}</td></tr>`});
  html+='</table>';
  const blob=new Blob(['\ufeff'+html],{type:'application/vnd.ms-excel;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='Inventario_PDA_Expedicion.xls'; document.body.appendChild(a); a.click(); a.remove();
}
function esc(v){return String(v||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
load(); initControls(); render();

```
