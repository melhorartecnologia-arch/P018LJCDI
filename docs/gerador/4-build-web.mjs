import { readFileSync, writeFileSync } from 'node:fs';
const WF = JSON.parse(readFileSync('/tmp/claude-0/-home-user-P018LJCDI/c5c10de0-ae73-5d88-b866-fe641e3f1fc6/scratchpad/deck-data.json','utf8'));
const total = WF.reduce((a,w)=>a+w.eventos.length,0);
const esc = s => String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-');

const css = `
:root{
  --bg:#f7f4ee; --surface:#ffffff; --surface-2:#faf7f0; --ink:#272525; --ink-soft:#4a453d;
  --muted:#8a8378; --faint:#b0a795; --border:#eae3d6; --border-2:#f1ece2;
  --gold:#B38335; --gold-deep:#8a6428; --gold-tint:#faf3e4; --gold-line:#e6cf9e;
  --shadow:0 18px 50px rgba(39,37,37,.10); --shadow-sm:0 8px 24px rgba(39,37,37,.08);
}
@media (prefers-color-scheme:dark){:root{
  --bg:#1a1815; --surface:#232019; --surface-2:#2a251d; --ink:#f1ece2; --ink-soft:#d8d0c2;
  --muted:#a89f90; --faint:#7d766a; --border:#37312a; --border-2:#2f2a23;
  --gold:#cfa055; --gold-deep:#e3bf7e; --gold-tint:#2c2416; --gold-line:#4a3c22;
  --shadow:0 18px 50px rgba(0,0,0,.45); --shadow-sm:0 8px 24px rgba(0,0,0,.35);
}}
:root[data-theme="dark"]{
  --bg:#1a1815; --surface:#232019; --surface-2:#2a251d; --ink:#f1ece2; --ink-soft:#d8d0c2;
  --muted:#a89f90; --faint:#7d766a; --border:#37312a; --border-2:#2f2a23;
  --gold:#cfa055; --gold-deep:#e3bf7e; --gold-tint:#2c2416; --gold-line:#4a3c22;
  --shadow:0 18px 50px rgba(0,0,0,.45); --shadow-sm:0 8px 24px rgba(0,0,0,.35);
}
:root[data-theme="light"]{
  --bg:#f7f4ee; --surface:#ffffff; --surface-2:#faf7f0; --ink:#272525; --ink-soft:#4a453d;
  --muted:#8a8378; --faint:#b0a795; --border:#eae3d6; --border-2:#f1ece2;
  --gold:#B38335; --gold-deep:#8a6428; --gold-tint:#faf3e4; --gold-line:#e6cf9e;
  --shadow:0 18px 50px rgba(39,37,37,.10); --shadow-sm:0 8px 24px rgba(39,37,37,.08);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--bg);color:var(--ink);
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
.serif{font-family:Georgia,'Iowan Old Style','Times New Roman',serif}
a{color:var(--gold-deep);text-decoration:none}
img{max-width:100%;display:block}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}

/* masthead */
.mast{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 86%,transparent);
  backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--border)}
.mast .row{display:flex;align-items:center;gap:18px;height:60px}
.brand{display:flex;align-items:center;gap:11px}
.badge{width:34px;height:34px;border-radius:9px;flex:none;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#cfa055,#B38335 55%,#8a6428);color:#fff;font-family:Georgia,serif;font-weight:700;font-size:15px}
.brand b{font-family:Georgia,serif;font-weight:700;letter-spacing:.13em;font-size:14px}
.brand span{display:block;font-size:9.5px;letter-spacing:.16em;color:var(--muted);margin-top:1px}
.nav{margin-left:auto;display:flex;gap:4px;flex-wrap:wrap}
.nav a{font-size:12.5px;font-weight:600;color:var(--ink-soft);padding:7px 11px;border-radius:8px}
.nav a:hover{background:var(--surface-2);color:var(--gold-deep)}

/* hero */
.hero{padding:74px 0 40px;border-bottom:1px solid var(--border)}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:.18em;color:var(--gold);text-transform:uppercase}
.hero h1{font-weight:700;font-size:clamp(34px,5vw,56px);line-height:1.05;letter-spacing:-.01em;margin:16px 0 0;text-wrap:balance}
.hero p{font-size:clamp(16px,2vw,19px);color:var(--ink-soft);max-width:64ch;margin:18px 0 0}
.stat-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 18px;box-shadow:var(--shadow-sm)}
.stat b{font-family:Georgia,serif;font-size:22px;color:var(--gold-deep)}
.stat span{display:block;font-size:12px;color:var(--muted);letter-spacing:.02em}

/* generic section */
section{padding:52px 0}
.sec-head{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:8px}
.sec-head h2{font-family:Georgia,serif;font-weight:700;font-size:clamp(24px,3.4vw,34px);margin:0;letter-spacing:-.01em}
h2 .num{color:var(--faint);font-size:.62em;font-weight:700;margin-right:.5em}
.lead{color:var(--ink-soft);max-width:70ch;margin:6px 0 0;font-size:16.5px}

/* how-it-works flow */
.flow{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:26px}
.flow .node{background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:16px;box-shadow:var(--shadow-sm)}
.flow .k{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--gold)}
.flow .t{font-weight:650;margin-top:6px;font-size:14.5px}
.flow .s{font-size:12.5px;color:var(--muted);margin-top:4px}
.twocol{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}
.panel{background:var(--surface-2);border:1px solid var(--border);border-radius:14px;padding:18px 20px}
.panel h3{margin:0 0 6px;font-size:16px}
.panel p{margin:0;color:var(--ink-soft);font-size:14.5px}

/* workflow overview cards */
.wf-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px}
.wf-card{background:var(--surface);border:1px solid var(--border);border-left:5px solid var(--wf);border-radius:14px;padding:18px 20px;box-shadow:var(--shadow-sm)}
.wf-card .top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.wf-card h3{font-family:Georgia,serif;margin:0;font-size:20px}
.pill{font-size:12px;font-weight:700;color:var(--wf);background:color-mix(in srgb,var(--wf) 14%,transparent);border-radius:20px;padding:3px 11px;white-space:nowrap}
.wf-card p{margin:8px 0 0;font-size:14px;color:var(--muted)}

/* workflow section header band */
.band{border-top:1px solid var(--border)}
.band .eyebrow{color:var(--wf)}
.band h2{color:var(--ink)}
.band .bartag{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:var(--muted);margin-top:10px}
.band .dot{width:9px;height:9px;border-radius:50%;background:var(--wf)}

/* event card */
.event{display:grid;grid-template-columns:minmax(0,440px) 1fr;gap:30px;align-items:start;
  padding:30px 0;border-top:1px solid var(--border-2)}
.mail{background:var(--surface-2);border:1px solid var(--border);border-radius:14px;padding:16px;box-shadow:var(--shadow)}
.mail img{border-radius:9px;box-shadow:0 6px 20px rgba(39,37,37,.14);width:100%}
.ev-body h3{font-family:Georgia,serif;font-size:22px;margin:2px 0 4px;letter-spacing:-.01em;text-wrap:balance}
.ev-tag{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--wf);
  background:color-mix(in srgb,var(--wf) 13%,transparent);border-radius:7px;padding:4px 9px}
.meta{margin:16px 0 0;border-top:1px solid var(--border-2)}
.meta .r{display:grid;grid-template-columns:130px 1fr;gap:12px;padding:9px 0;border-bottom:1px solid var(--border-2)}
.meta .r .k{font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);padding-top:2px}
.meta .r .v{font-size:14.5px;color:var(--ink)}
.meta .r .v.subj{font-weight:600}
.context{margin-top:16px;background:var(--ink);color:#f1ece2;border-radius:12px;padding:15px 17px}
:root[data-theme="dark"] .context,:root:not([data-theme="light"]) .context{}
.context .k{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gold-deep)}
:root[data-theme="dark"] .context .k{color:#e3bf7e}
.context p{margin:6px 0 0;font-size:14.5px;line-height:1.55;color:#f1ece2}
.itens-chip{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--gold-deep);
  background:var(--gold-tint);border:1px solid var(--gold-line);border-radius:20px;padding:3px 10px;margin-left:8px}

/* footer */
footer{border-top:1px solid var(--border);padding:34px 0 50px;color:var(--muted);font-size:13px}
footer .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:18px 0 22px}
footer .step{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:15px 16px}
footer .step .n{width:26px;height:26px;border-radius:50%;background:var(--gold);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:13px}
footer .step b{display:block;margin:9px 0 4px;color:var(--ink);font-size:14.5px}
footer .step span{font-size:13px;color:var(--muted)}

.reveal{opacity:0;transform:translateY(10px);transition:opacity .5s ease,transform .5s ease}
.reveal.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}}

@media (max-width:820px){
  .flow{grid-template-columns:1fr 1fr}.twocol{grid-template-columns:1fr}.wf-grid{grid-template-columns:1fr}
  footer .steps{grid-template-columns:1fr}
  .event{grid-template-columns:1fr;gap:18px}.mail{max-width:480px}
  .nav{display:none}
}
`;

const navLinks = WF.map(w=>`<a href="#${slug(w.nome)}">${esc(w.nome)}</a>`).join('');

const flow = [
  ['Ação no sistema','Aprovar, cotar, faturar, cobrar — inteiro ou por item'],
  ['Notificação','A plataforma monta o e-mail do evento'],
  ['SMTP configurado','Enviado pelo remetente oficial, se ativo'],
  ['Destinatário','Revenda · Fornecedor · Loja'],
].map(([k,s],i)=>`<div class="node"><div class="k">${i+1}. ${esc(k)}</div><div class="s">${esc(s)}</div></div>`).join('');

const overview = WF.map(w=>`<div class="wf-card" style="--wf:${w.cor}">
  <div class="top"><h3>${esc(w.nome)}</h3><span class="pill">${w.eventos.length} e-mails</span></div>
  <p>${esc(w.resumo)}</p></div>`).join('');

let secNum = 3;
const sections = WF.map(w=>{
  const events = w.eventos.map(ev=>{
    const temItens = Array.isArray(ev.vars&&ev.vars.itensLista) && ev.vars.itensLista.length;
    return `<article class="event reveal" style="--wf:${w.cor}">
      <div class="mail"><img src="${ev.img}" alt="Modelo de e-mail: ${esc(ev.titulo)}" loading="lazy"></div>
      <div class="ev-body">
        <span class="ev-tag"><span class="dot" style="width:7px;height:7px;border-radius:50%;background:${w.cor};display:inline-block"></span>${esc(w.nome)}</span>
        <h3>${esc(ev.titulo)}${temItens?'<span class="itens-chip">✓ lista de itens</span>':''}</h3>
        <div class="meta">
          <div class="r"><div class="k">Gatilho</div><div class="v">${esc(ev.gatilho)}</div></div>
          <div class="r"><div class="k">Destinatário</div><div class="v">${esc(ev.dest)}</div></div>
          <div class="r"><div class="k">Assunto</div><div class="v subj">${esc(ev.subject)}</div></div>
        </div>
        <div class="context"><div class="k">Contexto de negócio</div><p>${esc(ev.contexto)}</p></div>
      </div>
    </article>`;
  }).join('');
  secNum++;
  return `<section id="${slug(w.nome)}" class="band" style="--wf:${w.cor}">
    <div class="wrap">
      <div class="eyebrow">Fluxo</div>
      <div class="sec-head"><h2><span class="num">${String(secNum).padStart(2,'0')}</span>${esc(w.nome)}</h2></div>
      <p class="lead">${esc(w.resumo)}</p>
      <div class="bartag"><span class="dot"></span>${w.eventos.length} modelos de e-mail neste fluxo</div>
      ${events}
    </div>
  </section>`;
}).join('');

const html = `<title>Fluxos de E-mail · Plataforma Cidade Imperial</title>
<style>${css}</style>
<header class="mast"><div class="wrap"><div class="row">
  <div class="brand"><div class="badge">CI</div><div><b>CIDADE IMPERIAL</b><span>PLATAFORMA DA LOJA</span></div></div>
  <nav class="nav">${navLinks}</nav>
</div></div></header>

<div class="hero"><div class="wrap">
  <div class="eyebrow">Notificações por e-mail · SMTP</div>
  <h1 class="serif">Workflows de comunicação automática</h1>
  <p>Em cada etapa de <b>pedidos</b>, <b>cotações</b>, <b>faturamento</b> e <b>royalties</b>, a plataforma envia um e-mail com modelo próprio para o responsável certo — aprovações do processo inteiro ou por item, sempre com a lista de itens envolvidos.</p>
  <div class="stat-row">
    <div class="stat"><b>${total}</b><span>modelos de e-mail</span></div>
    <div class="stat"><b>4</b><span>fluxos de negócio</span></div>
    <div class="stat"><b>3</b><span>perfis: Loja · Fornecedor · Revenda</span></div>
  </div>
</div></div>

<section><div class="wrap">
  <div class="eyebrow">Como funciona</div>
  <div class="sec-head"><h2><span class="num">01</span>Comunicação automática e rastreável</h2></div>
  <p class="lead">A plataforma conecta Loja, Fornecedores e Revendas. Cada ação relevante gera, em segundo plano, um e-mail transacional — sem trabalho manual e sempre pelo remetente oficial configurado.</p>
  <div class="flow">${flow}</div>
  <div class="twocol">
    <div class="panel"><h3>Por que importa</h3><p>Reduz atrasos e retrabalho, dá transparência às revendas, aciona fornecedores na hora certa e cria uma trilha de comunicação em todo o ciclo de compra e financeiro.</p></div>
    <div class="panel"><h3>Como é controlado</h3><p>Um modelo específico por caso de uso · destinatários resolvidos automaticamente · envio só quando o administrador ativa o SMTP · gravado no banco da plataforma.</p></div>
  </div>
</div></section>

<section><div class="wrap">
  <div class="eyebrow">Visão geral</div>
  <div class="sec-head"><h2><span class="num">02</span>Quatro fluxos, ${total} e-mails</h2></div>
  <div class="wf-grid">${overview}</div>
</div></section>

${sections}

<footer><div class="wrap">
  <div class="eyebrow" style="color:var(--gold)">Como ativar</div>
  <div class="sec-head"><h2 style="font-size:26px"><span class="num">${String(secNum+1).padStart(2,'0')}</span>Ligue os e-mails em 3 passos</h2></div>
  <div class="steps">
    <div class="step"><div class="n">1</div><b>Configurar</b><span>Loja › Configurações Técnicas › Configuração de e-mail: servidor SMTP, remetente e o e-mail interno da Loja.</span></div>
    <div class="step"><div class="n">2</div><b>Ativar e testar</b><span>Ative o envio e use “Verificar conexão” e “Enviar e-mail de teste”.</span></div>
    <div class="step"><div class="n">3</div><b>Operar</b><span>Cada ação passa a disparar o e-mail certo, já com os itens do processo.</span></div>
  </div>
  <p>Enquanto o envio permanece desativado, nenhum e-mail é disparado — ideal para homologação. · Plataforma Cidade Imperial · Cervejaria Cidade Imperial.</p>
</div></footer>

<script>
(function(){
  var els=document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion:reduce)').matches){els.forEach(function(e){e.classList.add('in')});return;}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{rootMargin:'0px 0px -8% 0px'});
  els.forEach(function(e){io.observe(e)});
})();
</script>`;

writeFileSync('/home/user/P018LJCDI/docs/fluxos-email-web.html', html);
console.log('artifact HTML:', html.length, 'bytes ·', total, 'eventos');
