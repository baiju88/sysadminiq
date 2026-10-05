const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let DB={articles:[],scripts:[],commands:[],resources:[],log_map:[]}, currentCase=null, adminType='articles', editingId=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=v=>Array.isArray(v)?v:(v?String(v).split(/\n|\r\n/).map(x=>x.trim()).filter(Boolean):[]);
const LOCAL_KEY='sysAdminIQKB_v420';
const LEGACY_KEY='vmwareTroubleshootingKB_v23';
const PREVIOUS_KEY='systemAdminTroubleshootingKB_v25'
const OLDER_KEY='systemAdminTroubleshootingKB_v24';
const MAIN_CATEGORIES=[{name:'VMware',short:'VM',desc:'vSphere, ESXi, vCenter, VCF, storage and networking'},{name:'Windows',short:'W',desc:'Windows Server, services, events, AD and PowerShell'},{name:'Linux',short:'L',desc:'Linux systems, services, storage, networking and shell'},{name:'AWS',short:'A',desc:'EC2, EBS, VPC, IAM, CloudWatch and AWS CLI'},{name:'Azure',short:'AZ',desc:'VMs, networking, storage, identity and Azure CLI'},{name:'Cisco UCS',short:'UCS',desc:'Fabric Interconnects, blades, service profiles, firmware, LAN and SAN'}];
let BACKEND_ONLINE=false;
function embeddedDB(){
  const get=(name)=>{
    try{return (typeof window!=="undefined" && window[name]!==undefined)?window[name]:[];}catch(e){return [];}
  };
  return normalizeDB({articles:get('KB_ARTICLES'),scripts:get('SCRIPTS'),commands:get('COMMANDS'),resources:get('RESOURCES'),log_map:get('LOG_MAP')});
}
function normalizeDB(data){const out={articles:[],scripts:[],commands:[],resources:[],log_map:[],...(data||{})};for(const k of ['articles','scripts','commands','resources'])out[k]=(Array.isArray(out[k])?out[k]:[]).map(x=>({...x,platform:x.platform||'VMware'}));out.log_map=Array.isArray(out.log_map)?out.log_map:[];return out}
function localDB(){try{const cur=JSON.parse(localStorage.getItem(LOCAL_KEY)||'null');if(cur&&typeof cur==='object')return normalizeDB(cur);const previous=JSON.parse(localStorage.getItem(PREVIOUS_KEY)||'null');if(previous&&typeof previous==='object'){const migrated=normalizeDB(previous);saveLocal(migrated);return migrated}const legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null');if(legacy&&typeof legacy==='object'){const migrated=normalizeDB(legacy);saveLocal(migrated);return migrated}}catch(e){}return embeddedDB()}
function saveLocal(data){localStorage.setItem(LOCAL_KEY,JSON.stringify(data));}
async function api(url,opt={}){
  try{
    const r=await fetch(url,{headers:{'Content-Type':'application/json',...(opt.headers||{})},...opt});
    const text=await r.text(); let d={}; try{d=JSON.parse(text)}catch(e){throw Error(`Server returned invalid JSON (HTTP ${r.status})`)}
    if(!r.ok||d.ok===false)throw Error(d.error||`HTTP ${r.status}`);
    BACKEND_ONLINE=true; updateBackendStatus(); return d;
  }catch(e){
    BACKEND_ONLINE=false; updateBackendStatus();
    if(e instanceof TypeError || /Failed to fetch|NetworkError|fetch/i.test(e.message)) throw Error('Backend server is not running. Local browser save is available.');
    throw e;
  }
}
async function loadDB(){

  const fallback = embeddedDB();

  try{

    const response =
      await fetch(
        'https://sysadminiq-api.baijucm.workers.dev'
      );

    const d1Articles =
      await response.json();

    DB = {
      ...fallback,
      articles: d1Articles
    };

    saveLocal(DB);

    BACKEND_ONLINE = true;

  }
  catch(e){

    DB = fallback;

    saveLocal(DB);

    BACKEND_ONLINE = false;

    console.warn(e);

  }

  renderAll();

  updateBackendStatus();

}

function updateBackendStatus(){
  const el=$('#backendStatus');
  if(el) el.innerHTML=BACKEND_ONLINE?'<span class="status-dot online"></span> Server connected — '+DB.articles.length+' articles loaded':'<span class="status-dot offline"></span> Local mode — '+DB.articles.length+' articles loaded from the embedded knowledge base';
}

function copy(text){navigator.clipboard.writeText(Array.isArray(text)?text.join('\n'):String(text)).then(()=>alert('Copied to clipboard.')).catch(()=>{});}
function nav(view){$$('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===view));$$('.view').forEach(x=>x.classList.toggle('active',x.id===view));}
function platformOf(x){return x.platform||'VMware'}
function renderStats(){const cats=[...new Set(DB.articles.map(x=>x.category).filter(Boolean))];$('#stats').innerHTML=`<div class="stat"><b>${DB.articles.length}</b><span>Knowledge articles</span></div><div class="stat"><b>${cats.length}</b><span>Subcategories</span></div><div class="stat"><b>${DB.commands.length}</b><span>Commands indexed</span></div><div class="stat"><b>${DB.scripts.length}</b><span>Automation scripts</span></div>`}
function scoreArticle(a,text){const t=text.toLowerCase();return [a.title,a.platform,a.category,...arr(a.keywords),...arr(a.symptoms),...arr(a.causes),...arr(a.logs)].reduce((n,x)=>n+(t.includes(String(x).toLowerCase())?3:String(x).toLowerCase().split(/\s+/).filter(w=>w.length>3&&t.includes(w)).length),0)}
function findMatches(text){return DB.articles.map(a=>({...a,score:scoreArticle(a,text)})).filter(a=>a.score>0).sort((a,b)=>b.score-a.score)}
function articleCard(a){return `<div class="article-card" data-article="${esc(a.id)}"><span class="tag">${esc(platformOf(a))}</span><span class="subtag">${esc(a.category||'General')}</span><h3>${esc(a.title)}</h3><p>${esc(arr(a.symptoms)[0]||a.description||'Troubleshooting article')}</p></div>`}
function bindArticleCards(){$$('[data-article]').forEach(e=>e.onclick=()=>openArticle(DB.articles.find(a=>a.id===e.dataset.article)))}
function openArticle(a){

    if(!a) return;

    const isD1Article =
        a.content &&
        !a.symptoms &&
        !a.causes;

    if(isD1Article){

        $('#modalContent').innerHTML = `
        <div class="article-detail">

            <span class="tag">${esc(platformOf(a))}</span>

            <span class="subtag">
                ${esc(a.category || 'General')}
            </span>

            <h1>${esc(a.title)}</h1>

            <h3>Article Content</h3>

            <pre style="
                white-space:pre-wrap;
                padding:15px;
                background:#f5f5f5;
                border-radius:6px;
            ">${esc(a.content || '')}</pre>

        </div>
        `;

    } else {

        const list=x=>`<ul>${
            arr(x).map(v=>`<li>${esc(v)}</li>`).join('')
        }</ul>`;

        $('#modalContent').innerHTML=`
        <div class="article-detail">

            <span class="tag">${esc(platformOf(a))}</span>
            <span class="subtag">${esc(a.category||'General')}</span>

            <h1>${esc(a.title)}</h1>

            <p class="muted">${esc(a.description||'')}</p>

            <h3>Symptoms</h3>
            ${list(a.symptoms)}

            <h3>Likely causes</h3>
            ${list(a.causes)}

            <h3>Investigation checks</h3>

            <ol>
                ${arr(a.checks).map(x=>`<li>${esc(x)}</li>`).join('')}
            </ol>

            <h3>Commands</h3>

            <button class="copy"
                onclick='copy(${JSON.stringify(a.commands||"")})'>
                Copy
            </button>

            <pre>${esc(a.commands||'')}</pre>

            <h3>Important logs</h3>
            ${list(a.logs)}

            <h3>Resolution approach</h3>

            <ol>
                ${arr(a.resolution).map(x=>`<li>${esc(x)}</li>`).join('')}
            </ol>

            <h3>Verification</h3>
            ${list(a.verification)}

        </div>
        `;
    }

    $('#articleModal').classList.remove('hidden');
}
function renderPlatformCards(){$('#platformCards').innerHTML=MAIN_CATEGORIES.map(c=>{const count=DB.articles.filter(a=>platformOf(a)===c.name).length;return `<div class="platform-card" data-platform-card="${esc(c.name)}"><div class="platform-icon">${esc(c.short)}</div><div><h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p><b>${count} article${count===1?'':'s'}</b></div><span class="arrow">→</span></div>`}).join('');$$('[data-platform-card]').forEach(e=>e.onclick=()=>openPlatform(e.dataset.platformCard))}
function openPlatform(platform){nav('knowledge');$('#kbPlatform').value=platform;$('#kbCategory').value='all';renderKB($('#kbSearch').value,platform,'all');$$('.platform-nav').forEach(b=>b.classList.toggle('active',b.dataset.platform===platform))}
function renderDashboard(){renderStats();renderPlatformCards();$('#quickCards').innerHTML=DB.articles.slice(0,6).map(a=>`<div class="quick" data-article="${esc(a.id)}"><span class="tag">${esc(platformOf(a))}</span><span class="subtag">${esc(a.category||'General')}</span><h3>${esc(a.title)}</h3><p>${esc(arr(a.causes).slice(0,2).join(' • '))}</p></div>`).join('');$('#recentArticles').innerHTML=DB.articles.slice(-5).reverse().map(articleCard).join('');bindArticleCards()}
function renderKB(text='',platform='all',category='all'){const q=text.toLowerCase();const out=DB.articles.filter(a=>(platform==='all'||platformOf(a)===platform)&&(category==='all'||a.category===category)&&(!q||JSON.stringify(a).toLowerCase().includes(q)));$('#kbResults').innerHTML=out.map(articleCard).join('')||'<div class="panel">No matching articles found for this filter. Add content from Content Manager.</div>';bindArticleCards()}
function setupFilters(){const cats=[...new Set(DB.articles.map(a=>a.category).filter(Boolean))];$('#categoryFilters').innerHTML=MAIN_CATEGORIES.map(c=>`<label class="filter"><input type="checkbox" checked value="${esc(c.name)}"> ${esc(c.name)} <small>${DB.articles.filter(a=>platformOf(a)===c.name).length}</small></label>`).join('');$('#kbCategory').innerHTML='<option value="all">All subcategories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}
function renderCommands(q=''){q=q.toLowerCase();$('#commandResults').innerHTML=DB.commands.filter(x=>!q||JSON.stringify(x).toLowerCase().includes(q)).map((x,i)=>`<div class="command"><button class="copy" data-copy="${i}">Copy</button><b>${esc(x.name||x.title)}</b><br><small>${esc(x.category||'')} — ${esc(x.use||x.description||'')}</small><pre>${esc(x.cmd||x.code||'')}</pre></div>`).join('')||'<div class="panel">No commands found.</div>';$$('[data-copy]').forEach(b=>b.onclick=()=>copy(DB.commands[+b.dataset.copy].cmd||DB.commands[+b.dataset.copy].code||''))}
function renderScripts(){ $('#scriptResults').innerHTML=DB.scripts.map((s,i)=>`<div class="article-card"><span class="tag">${esc(s.category||'PowerCLI')}</span><h3>${esc(s.title||s.name)}</h3><p>${esc(s.desc||s.description||'')}</p><button class="copy" data-script="${i}">Copy</button><pre>${esc(s.code||'')}</pre></div>`).join('')||'<div class="panel">No scripts found.</div>';$$('[data-script]').forEach(b=>b.onclick=()=>copy(DB.scripts[+b.dataset.script].code||''))}
function renderResources(q='',cat='all'){const out=DB.resources.filter(r=>(cat==='all'||r.category===cat)&&(!q||JSON.stringify(r).toLowerCase().includes(q.toLowerCase())));$('#resourceResults').innerHTML=out.map(r=>`<div class="article-card"><span class="tag">${esc(r.category||'Resource')}</span><h3>${esc(r.name||r.title)}</h3><p>${esc(r.description||r.notes||'')}</p>${r.url?`<a class="result-link" href="${esc(r.url)}" target="_blank" rel="noopener">Open resource →</a>`:''}</div>`).join('')||'<div class="panel">No resources found.</div>';$('#resourceCategory').innerHTML='<option value="all">All categories</option>'+[...new Set(DB.resources.map(x=>x.category).filter(Boolean))].map(c=>`<option>${esc(c)}</option>`).join('')}
function analyze(){const text=$('#issueInput').value.trim();if(!text){$('#analysisOutput').innerHTML='<div class="result-panel">Please enter an issue description or log excerpt.</div>';return}const matches=findMatches(text);currentCase={input:text,matches,when:new Date().toLocaleString()};const top=matches.slice(0,3);let html='<div class="result-panel"><h2>Investigation plan</h2>';if(!top.length)html+='<div class="diagnosis"><b>No strong local match yet.</b><br>Start with service status, capacity, network reachability and the earliest relevant log error.</div>';else top.forEach((a,i)=>html+=`<div class="diagnosis"><span class="score">Match ${i+1}: ${a.score}</span><h3>${esc(a.title)}</h3><b>Likely causes</b>${'<ul>'+arr(a.causes).slice(0,4).map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>'}<b>Next checks</b>${'<ol>'+arr(a.checks).slice(0,5).map(x=>`<li>${esc(x)}</li>`).join('')+'</ol>'}<button onclick='openArticle(${JSON.stringify(a)})'>Open full article</button></div>`);html+='</div>';$('#analysisOutput').innerHTML=html}
function inspectLogs(){const text=$('#logInput').value.trim();if(!text){$('#logOutput').innerHTML='<div class="result-panel">Paste a log excerpt first.</div>';return}const patterns=[['vpxd','vCenter Server'],['hostd','ESXi host management'],['vpxa','vCenter agent communication'],['vmkernel','ESXi kernel/storage/network'],['fdm','vSphere HA'],['vmon','vCenter service lifecycle'],['certificate|ssl|trust','Certificate / TLS'],['apd|all paths down','Storage path / APD']];const hits=patterns.filter(([p])=>new RegExp(p,'i').test(text));$('#logOutput').innerHTML='<div class="result-panel"><h2>Detected components</h2>'+(hits.length?hits.map(x=>`<div class="log-hit"><b>${esc(x[1])}</b><br>Search related entries in the corresponding VMware log and correlate timestamps.</div>`).join(''):'No known VMware component pattern detected.')+'</div>'}
async function internetSearch(){const q=$('#internetSearch').value.trim();if(!q)return;$('#internetStatus').innerHTML='<div class="internet-loading">Searching...</div>';$('#internetResults').innerHTML='';try{const d=await api('/api/search?q='+encodeURIComponent(q)+'&scope='+encodeURIComponent($('#internetScope').value));$('#internetStatus').innerHTML=`<div class="internet-meta">${esc(d.results.length)} results from ${esc(d.engine)}.</div>`;$('#internetResults').innerHTML=d.results.map((r,i)=>`<div class="internet-result-card"><div class="result-number">${i+1}</div><div class="result-body"><h3>${esc(r.title)}</h3><p>${esc(r.snippet)}</p><div class="result-url">${esc(r.url)}</div><a class="result-link" href="${esc(r.url)}" target="_blank" rel="noopener">Open article →</a></div></div>`).join('')}catch(e){$('#internetStatus').innerHTML=`<div class="internet-error">${esc(e.message)}</div>`}}
function platformSelect(id,value){return `<select id="${id}">${MAIN_CATEGORIES.map(c=>`<option ${value===c.name?'selected':''}>${c.name}</option>`).join('')}</select>`}
function fieldsFor(type,item={}){if(type==='articles')return `<div class="form-grid"><label>Title<input id="f-title" value="${esc(item.title||'')}"></label><label>Main Category${platformSelect('f-platform',item.platform||'VMware')}</label><label>Subcategory<input id="f-category" value="${esc(item.category||'General')}"></label><label class="wide">Keywords <span class="hint">one per line</span><textarea id="f-keywords">${esc(arr(item.keywords).join('\n'))}</textarea></label><label class="wide">Symptoms<textarea id="f-symptoms">${esc(arr(item.symptoms).join('\n'))}</textarea></label><label class="wide">Likely causes<textarea id="f-causes">${esc(arr(item.causes).join('\n'))}</textarea></label><label class="wide">Investigation checks<textarea id="f-checks">${esc(arr(item.checks).join('\n'))}</textarea></label><label class="wide">Commands<textarea id="f-commands">${esc(item.commands||'')}</textarea></label><label class="wide">Important logs<textarea id="f-logs">${esc(arr(item.logs).join('\n'))}</textarea></label><label class="wide">Resolution steps<textarea id="f-resolution">${esc(arr(item.resolution).join('\n'))}</textarea></label><label class="wide">Verification<textarea id="f-verification">${esc(arr(item.verification).join('\n'))}</textarea></label></div>`;if(type==='scripts')return `<div class="form-grid"><label>Title<input id="f-title" value="${esc(item.title||'')}"></label><label>Main Category${platformSelect('f-platform',item.platform||'VMware')}</label><label>Subcategory<input id="f-category" value="${esc(item.category||'Automation')}"></label><label class="wide">Description<textarea id="f-description">${esc(item.desc||item.description||'')}</textarea></label><label class="wide">PowerShell / PowerCLI / Bash / CLI code<textarea id="f-code" rows="14">${esc(item.code||'')}</textarea></label></div>`;if(type==='commands')return `<div class="form-grid"><label>Name<input id="f-name" value="${esc(item.name||item.title||'')}"></label><label>Main Category${platformSelect('f-platform',item.platform||'VMware')}</label><label>Subcategory<input id="f-category" value="${esc(item.category||'General')}"></label><label class="wide">Command<textarea id="f-cmd">${esc(item.cmd||'')}</textarea></label><label class="wide">Use / description<textarea id="f-use">${esc(item.use||item.description||'')}</textarea></label></div>`;return `<div class="form-grid"><label>Name<input id="f-name" value="${esc(item.name||item.title||'')}"></label><label>Main Category${platformSelect('f-platform',item.platform||'VMware')}</label><label>Subcategory<input id="f-category" value="${esc(item.category||'Documentation')}"></label><label class="wide">URL<input id="f-url" value="${esc(item.url||'')}"></label><label class="wide">Description<textarea id="f-description">${esc(item.description||'')}</textarea></label><label class="wide">Notes<textarea id="f-notes">${esc(item.notes||'')}</textarea></label></div>`}
function formData(type){const g=id=>$('#'+id)?.value||'';if(type==='articles')return {title:g('f-title'),platform:g('f-platform'),category:g('f-category'),keywords:arr(g('f-keywords')),symptoms:arr(g('f-symptoms')),causes:arr(g('f-causes')),checks:arr(g('f-checks')),commands:g('f-commands'),logs:arr(g('f-logs')),resolution:arr(g('f-resolution')),verification:arr(g('f-verification'))};if(type==='scripts')return {title:g('f-title'),platform:g('f-platform'),category:g('f-category'),desc:g('f-description'),code:g('f-code')};if(type==='commands')return {name:g('f-name'),platform:g('f-platform'),category:g('f-category'),cmd:g('f-cmd'),use:g('f-use')};return {name:g('f-name'),platform:g('f-platform'),category:g('f-category'),url:g('f-url'),description:g('f-description'),notes:g('f-notes')};}
function adminList(type){const a=DB[type]||[];return `<div class="admin-list">${a.map(x=>`<div class="admin-row"><div><b>${esc(x.title||x.name)}</b><span>${esc(x.category||'')}</span></div><div><button class="secondary edit" data-id="${esc(x.id)}">Edit</button><button class="danger delete" data-id="${esc(x.id)}">Delete</button></div></div>`).join('')||'<div class="empty">No items yet.</div>'}</div>`}
function renderAdmin(){const item=editingId?(DB[adminType]||[]).find(x=>x.id===editingId):null;$('#adminContent').innerHTML=`<div class="admin-toolbar"><button id="newItem">＋ Add ${adminType==='articles'?'Article':adminType==='scripts'?'Script':adminType==='commands'?'Command':'Resource'}</button></div>${item||editingId===null&&false?'':''}<h3>${item?'Edit':'Manage'} ${adminType}</h3>${adminList(adminType)}${editingId!==null?`<div class="editor panel"><h3>${item?'Edit item':'Item'}</h3>${fieldsFor(adminType,item||{})}<div class="editor-actions"><button id="cancelEdit" class="secondary">Cancel</button><button id="saveItem" type="button">Save changes</button></div></div>`:''}`;$('#newItem').onclick=()=>{editingId='__new__';renderAdmin()};if(editingId==='__new__'){const editor=document.querySelector('.editor');if(!editor){$('#adminContent').insertAdjacentHTML('beforeend',`<div class="editor panel"><h3>Add new item</h3>${fieldsFor(adminType,{})}<div class="editor-actions"><button id="cancelEdit" class="secondary">Cancel</button><button id="saveItem" type="button">Save item</button></div></div>`);bindEditor();}}if(editingId!==null)bindEditor();$$('.edit').forEach(b=>b.onclick=()=>{editingId=b.dataset.id;renderAdmin()});$$('.delete').forEach(b=>b.onclick=()=>deleteItem(b.dataset.id));}
function bindEditor(){$('#cancelEdit').onclick=()=>{editingId=null;renderAdmin()};$('#saveItem').onclick=saveItem}
async function saveItem(){
  const btn=$('#saveItem'); if(btn){btn.disabled=true;btn.textContent='Saving...'}
  const wasNew=editingId==='__new__';
  try{
    const payload=formData(adminType); if(!payload.title&&!payload.name)throw Error('Title/name is required');
    if(BACKEND_ONLINE){
      try{
        const d=wasNew?await api('/api/'+adminType,{method:'POST',body:JSON.stringify(payload)}):await api('/api/'+adminType+'/'+encodeURIComponent(editingId),{method:'PUT',body:JSON.stringify({...payload,id:editingId})});
        DB=d.content;
      }catch(e){
        if(!/Backend server is not running|Failed to fetch|NetworkError/i.test(e.message))throw e;
        BACKEND_ONLINE=false;
      }
    }
    if(!BACKEND_ONLINE){
      const arrDB=DB[adminType]||[];
      if(wasNew){payload.id=slugify(payload.title||payload.name||adminType);let base=payload.id,n=2;while(arrDB.some(x=>String(x.id)===String(payload.id)))payload.id=base+'-'+n++;arrDB.push(payload)}
      else{const idx=arrDB.findIndex(x=>String(x.id)===String(editingId));if(idx<0)throw Error('Item not found');payload.id=editingId;arrDB[idx]=payload}
      DB[adminType]=arrDB; saveLocal(DB);
    } else saveLocal(DB);
    editingId=null; renderAll(); switchAdmin(adminType); alert(BACKEND_ONLINE?'Saved successfully to content.json.':'Saved successfully in this browser.');
  }catch(e){alert('Save failed: '+e.message)}
  finally{if(btn){btn.disabled=false;btn.textContent='Save item'}}
}
function slugify(s){return String(s||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'item'}
async function deleteItem(id){
  if(!confirm('Delete this item? This cannot be undone unless you have a backup.'))return;
  try{
    if(BACKEND_ONLINE){try{const d=await api('/api/'+adminType+'/'+encodeURIComponent(id),{method:'DELETE'});DB=d.content}catch(e){if(!/Backend server is not running|Failed to fetch|NetworkError/i.test(e.message))throw e;BACKEND_ONLINE=false}}
    if(!BACKEND_ONLINE){DB[adminType]=(DB[adminType]||[]).filter(x=>String(x.id)!==String(id));saveLocal(DB)}else saveLocal(DB);
    renderAll();switchAdmin(adminType);alert(BACKEND_ONLINE?'Deleted from content.json.':'Deleted from this browser.');
  }catch(e){alert('Delete failed: '+e.message)}
}
function switchAdmin(type){adminType=type;editingId=null;$$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.admin===type));renderAdmin()}
function renderLogMap(){$('#logMap').innerHTML=(DB.log_map||[]).map(x=>`<div class="command"><b>${esc(x[0]||'')}</b><br><small>${esc(x[1]||'')}</small></div>`).join('')}
function renderAll(){renderDashboard();setupFilters();renderKB($('#kbSearch')?.value||'', $('#kbPlatform')?.value||'all', $('#kbCategory')?.value||'all');renderCommands();renderScripts();renderResources();renderLogMap();if($('#adminContent'))renderAdmin()}
$('#themeBtn').onclick=()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'':'dark';localStorage.vmTheme=document.documentElement.dataset.theme};if(localStorage.vmTheme)document.documentElement.dataset.theme=localStorage.vmTheme;
$$('.nav').forEach(b=>b.onclick=()=>nav(b.dataset.view));$$('.platform-nav').forEach(b=>b.onclick=()=>openPlatform(b.dataset.platform));$('#searchBtn').onclick=()=>{nav('knowledge');$('#kbSearch').value=$('#globalSearch').value;renderKB($('#globalSearch').value,$('#kbPlatform').value,$('#kbCategory').value)};$('#globalSearch').addEventListener('keydown',e=>e.key==='Enter'&&$('#searchBtn').click());$('#kbSearch').oninput=e=>renderKB(e.target.value,$('#kbPlatform').value,$('#kbCategory').value);$('#kbPlatform').onchange=e=>renderKB($('#kbSearch').value,e.target.value,$('#kbCategory').value);$('#kbCategory').onchange=e=>renderKB($('#kbSearch').value,$('#kbPlatform').value,e.target.value);$('#commandSearch').oninput=e=>renderCommands(e.target.value);$('#analyzeBtn').onclick=analyze;$('#inspectLogBtn').onclick=inspectLogs;$('#internetSearchBtn').onclick=internetSearch;$('#internetSearch').addEventListener('keydown',e=>e.key==='Enter'&&internetSearch());$('#resourceSearch').oninput=e=>renderResources(e.target.value,$('#resourceCategory').value);$('#resourceCategory').onchange=e=>renderResources($('#resourceSearch').value,e.target.value);$('#closeModal').onclick=()=>$('#articleModal').classList.add('hidden');$('#articleModal').onclick=e=>e.target.id==='articleModal'&&$('#articleModal').classList.add('hidden');$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(currentCase||{exported:new Date().toISOString()},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='vmware-troubleshooting-case.json';a.click();};
$$('.tab').forEach(t=>t.onclick=()=>switchAdmin(t.dataset.admin));if($('#backupBtn'))$('#backupBtn').onclick=()=>{const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sysadminiq-v3.2.1-kb-backup.json';a.click()};if($('#importBtn'))$('#importBtn').onclick=()=>$('#importFile').click();if($('#importFile'))$('#importFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(BACKEND_ONLINE){try{const d=await api('/api/import',{method:'POST',body:JSON.stringify(data)});DB=d.content}catch(err){if(!/Backend server is not running|Failed to fetch|NetworkError/i.test(err.message))throw err;BACKEND_ONLINE=false}}if(!BACKEND_ONLINE){DB=normalizeDB(data);saveLocal(DB)}else saveLocal(DB);renderAll();alert(BACKEND_ONLINE?'Knowledge base imported successfully.':'Knowledge base imported to this browser.')}catch(err){alert('Import failed: '+err.message)}e.target.value=''};
loadDB();
