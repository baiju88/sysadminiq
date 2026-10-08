
if(!a) return;

    const renderAttachments = (article) => {

        if(
            !article.attachments ||
            article.attachments.length === 0
        ){
            return `
                <h3>Attachments</h3>
                <p>No attachments available.</p>
            `;
        }

        return `
            <h3>Attachments</h3>

            <div class="attachments">

                ${
                    article.attachments.map(file => `

                        <div class="attachment-item">

                            📎
                            <strong>${esc(file.name)}</strong>

                            <br>

                            <small>
                                ${esc(file.type || "")}
                            </small>

                        </div>

                    `).join("")
                }

            </div>
        `;
    };

const isD1Article =
a.content &&
!a.symptoms &&
@@ -108,13 +148,17 @@ function openArticle(a){
$('#modalContent').innerHTML = `
       <div class="article-detail">

            <span class="tag">${esc(platformOf(a))}</span>
            <span class="tag">
                ${esc(platformOf(a))}
            </span>

           <span class="subtag">
               ${esc(a.category || 'General')}
           </span>

            <h1>${esc(a.title)}</h1>
            <h1>
                ${esc(a.title)}
            </h1>

           <h3>Article Content</h3>

@@ -133,24 +177,41 @@ overflow:auto;
${esc(a.content || '')}
</pre>

            ${renderAttachments(a)}

       </div>
       `;

} else {

        const list=x=>`<ul>${
            arr(x).map(v=>`<li>${esc(v)}</li>`).join('')
        }</ul>`;
        const list = x => `
            <ul>
                ${
                    arr(x)
                    .map(v=>`<li>${esc(v)}</li>`)
                    .join('')
                }
            </ul>
        `;

        $('#modalContent').innerHTML=`
        $('#modalContent').innerHTML = `
       <div class="article-detail">

            <span class="tag">${esc(platformOf(a))}</span>
            <span class="subtag">${esc(a.category||'General')}</span>
            <span class="tag">
                ${esc(platformOf(a))}
            </span>

            <span class="subtag">
                ${esc(a.category || 'General')}
            </span>

            <h1>${esc(a.title)}</h1>
            <h1>
                ${esc(a.title)}
            </h1>

            <p class="muted">${esc(a.description||'')}</p>
            <p class="muted">
                ${esc(a.description || '')}
            </p>

           <h3>Symptoms</h3>
           ${list(a.symptoms)}
@@ -161,14 +222,17 @@ ${esc(a.content || '')}
           <h3>Investigation checks</h3>

           <ol>
                ${arr(a.checks).map(x=>`<li>${esc(x)}</li>`).join('')}
                ${arr(a.checks)
                    .map(x=>`<li>${esc(x)}</li>`)
                    .join('')}
           </ol>

           <h3>Commands</h3>

            <button class="copy"
                onclick='copy(${JSON.stringify(a.commands||"")})'>
                Copy
            <button
              class="copy"
              onclick='copy(${JSON.stringify(a.commands||"")})'>
              Copy
           </button>

           <pre>${esc(a.commands||'')}</pre>
@@ -179,17 +243,22 @@ ${esc(a.content || '')}
           <h3>Resolution approach</h3>

           <ol>
                ${arr(a.resolution).map(x=>`<li>${esc(x)}</li>`).join('')}
                ${arr(a.resolution)
                    .map(x=>`<li>${esc(x)}</li>`)
                    .join('')}
           </ol>

           <h3>Verification</h3>
           ${list(a.verification)}

            ${renderAttachments(a)}

       </div>
       `;
}

    $('#articleModal').classList.remove('hidden');
    $('#articleModal')
        .classList.remove('hidden');
}
function renderPlatformCards(){$('#platformCards').innerHTML=MAIN_CATEGORIES.map(c=>{const count=DB.articles.filter(a=>platformOf(a)===c.name).length;return `<div class="platform-card" data-platform-card="${esc(c.name)}"><div class="platform-icon">${esc(c.short)}</div><div><h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p><b>${count} article${count===1?'':'s'}</b></div><span class="arrow">→</span></div>`}).join('');$$('[data-platform-card]').forEach(e=>e.onclick=()=>openPlatform(e.dataset.platformCard))}
function openPlatform(platform){nav('knowledge');$('#kbPlatform').value=platform;$('#kbCategory').value='all';renderKB($('#kbSearch').value,platform,'all');$$('.platform-nav').forEach(b=>b.classList.toggle('active',b.dataset.platform===platform))}
