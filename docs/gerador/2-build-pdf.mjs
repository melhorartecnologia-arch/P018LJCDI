import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { readFileSync, writeFileSync } from 'node:fs';
const { chromium } = pw;
const WF = JSON.parse(readFileSync('/tmp/claude-0/-home-user-P018LJCDI/c5c10de0-ae73-5d88-b866-fe641e3f1fc6/scratchpad/deck-data.json','utf8'));
const OUT = '/home/user/P018LJCDI/docs/Plataforma-Cidade-Imperial-Notificacoes-Email.pdf';
const totalEv = WF.reduce((a,w)=>a+w.eventos.length,0);

const esc = s => String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const slides = [];
const S = (inner, bg='#ffffff') => `<div class="slide" style="background:${bg}">${inner}</div>`;
const logo = (sz=54,fs=22)=>`<div style="width:${sz}px;height:${sz}px;border-radius:${sz*0.24}px;background:linear-gradient(135deg,#cfa055,#B38335 55%,#8a6428);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:${fs}px;color:#fff">CI</div>`;
const chip = (txt,cor)=>`<span style="display:inline-block;font-size:15px;font-weight:700;letter-spacing:.04em;color:${cor};background:${cor}18;border:1px solid ${cor}44;border-radius:8px;padding:5px 12px">${esc(txt)}</span>`;

// 1. Capa
slides.push(S(`
  <div style="position:absolute;inset:0;background:radial-gradient(1200px 600px at 70% -10%,#3a2f1c,#272525 55%,#1c1a18)"></div>
  <div style="position:absolute;left:70px;top:70px;display:flex;align-items:center;gap:16px">${logo(58,24)}
    <div><div style="font-family:Georgia,serif;font-weight:700;font-size:18px;letter-spacing:.14em;color:#fff">CIDADE IMPERIAL</div>
    <div style="font-size:12px;letter-spacing:.16em;color:#e3bf7e;margin-top:3px">PLATAFORMA DA LOJA</div></div></div>
  <div style="position:absolute;left:70px;bottom:120px;right:70px">
    <div style="font-size:16px;font-weight:700;letter-spacing:.18em;color:#e3bf7e;margin-bottom:16px">NOTIFICAÇÕES POR E-MAIL · SMTP</div>
    <div style="font-size:58px;font-weight:800;color:#fff;line-height:1.05;letter-spacing:-.5px">Workflows de comunicação<br>automática da plataforma</div>
    <div style="font-size:20px;color:#c9c1b4;margin-top:22px;max-width:820px;line-height:1.5">Pedidos · Cotações · Faturamento · Royalties — cada evento de negócio dispara um e-mail com modelo próprio para o responsável certo.</div>
  </div>
  <div style="position:absolute;right:70px;bottom:56px;font-size:13px;color:#8a8378">${totalEv} modelos de e-mail · 4 fluxos de negócio</div>
`));

// 2. Como funciona
const flowBox=(t,s,cor)=>`<div style="flex:1;background:#fff;border:1px solid #eae3d6;border-radius:14px;padding:18px 16px;text-align:center">
  <div style="font-size:15px;font-weight:700;color:${cor}">${esc(t)}</div><div style="font-size:12.5px;color:#8a8378;margin-top:6px;line-height:1.4">${esc(s)}</div></div>`;
const arrow=`<div style="align-self:center;color:#c9a24a;font-size:26px;font-weight:700">→</div>`;
slides.push(S(`
  <div style="padding:64px 70px">
    <div style="font-size:14px;font-weight:700;letter-spacing:.14em;color:#B38335">COMO FUNCIONA</div>
    <div style="font-size:36px;font-weight:800;color:#272525;margin:8px 0 6px">Comunicação automática e rastreável</div>
    <div style="font-size:17px;color:#6b6459;max-width:980px;line-height:1.5">A plataforma conecta Loja, Fornecedores e Revendas. Cada ação relevante gera, em segundo plano, um e-mail transacional — sem trabalho manual e sempre pelo remetente oficial configurado.</div>
    <div style="display:flex;gap:14px;margin:40px 0 36px">
      ${flowBox('Ação no sistema','Aprovar, cotar, faturar, cobrar…','#8f682a')}${arrow}
      ${flowBox('API de notificação','POST /api/email/notify','#33568f')}${arrow}
      ${flowBox('Configuração SMTP','Servidor, remetente, ativo/inativo','#1f6b5e')}${arrow}
      ${flowBox('E-mail ao destinatário','Revenda · Fornecedor · Loja','#B38335')}
    </div>
    <div style="display:flex;gap:20px">
      <div style="flex:1;background:#faf7f0;border:1px solid #eae3d6;border-radius:14px;padding:20px 22px">
        <div style="font-size:16px;font-weight:700;color:#272525;margin-bottom:8px">Por que importa (negócio)</div>
        <div style="font-size:14px;color:#5a5349;line-height:1.6">Reduz atrasos e retrabalho, dá transparência às revendas, aciona fornecedores na hora certa e cria trilha de comunicação em todo o ciclo de compra e financeiro.</div></div>
      <div style="flex:1;background:#faf7f0;border:1px solid #eae3d6;border-radius:14px;padding:20px 22px">
        <div style="font-size:16px;font-weight:700;color:#272525;margin-bottom:8px">Como é controlado</div>
        <div style="font-size:14px;color:#5a5349;line-height:1.6">Um modelo específico por caso de uso · destinatários resolvidos automaticamente · envio só quando o administrador ativa o SMTP · gravado no banco da plataforma.</div></div>
    </div>
  </div>
`,'#f7f4ee'));

// 3. Visão geral dos 4 fluxos
slides.push(S(`
  <div style="padding:64px 70px">
    <div style="font-size:14px;font-weight:700;letter-spacing:.14em;color:#B38335">VISÃO GERAL</div>
    <div style="font-size:36px;font-weight:800;color:#272525;margin:8px 0 30px">Quatro fluxos, ${totalEv} e-mails</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
      ${WF.map(w=>`<div style="background:#fff;border:1px solid #eae3d6;border-left:6px solid ${w.cor};border-radius:14px;padding:20px 22px">
        <div style="display:flex;align-items:center;justify-content:space-between"><div style="font-size:20px;font-weight:800;color:#272525">${esc(w.nome)}</div>
        <span style="font-size:13px;font-weight:700;color:${w.cor};background:${w.cor}14;border-radius:20px;padding:4px 12px">${w.eventos.length} e-mails</span></div>
        <div style="font-size:14px;color:#6b6459;margin-top:8px;line-height:1.5">${esc(w.resumo)}</div></div>`).join('')}
    </div>
  </div>
`,'#f7f4ee'));

// Por fluxo: capítulo + eventos
let n = 0;
for (const w of WF) {
  slides.push(S(`
    <div style="position:absolute;inset:0;background:linear-gradient(120deg,${w.cor},${w.cor}cc)"></div>
    <div style="position:absolute;left:70px;top:64px;display:flex;align-items:center;gap:14px">${logo(46,19)}<div style="font-family:Georgia,serif;font-weight:700;font-size:15px;letter-spacing:.12em;color:#fff">CIDADE IMPERIAL</div></div>
    <div style="position:absolute;left:70px;bottom:150px;right:70px">
      <div style="font-size:15px;font-weight:700;letter-spacing:.16em;color:#ffffffcc">FLUXO</div>
      <div style="font-size:52px;font-weight:800;color:#fff;margin:10px 0 18px">${esc(w.nome)}</div>
      <div style="font-size:19px;color:#ffffffe0;max-width:840px;line-height:1.5">${esc(w.resumo)}</div>
      <div style="font-size:15px;color:#ffffffb0;margin-top:20px">${w.eventos.length} modelos de e-mail neste fluxo</div>
    </div>`));
  for (const ev of w.eventos) {
    n++;
    slides.push(S(`
      <div style="height:100%;display:flex;flex-direction:column">
        <div style="padding:34px 60px 18px;border-bottom:1px solid #eee">
          <div style="display:flex;align-items:center;gap:12px">${chip(w.nome, w.cor)}<span style="font-size:13px;color:#a89f90;font-weight:600">e-mail automático</span></div>
          <div style="font-size:31px;font-weight:800;color:#272525;margin-top:12px">${esc(ev.titulo)}</div>
        </div>
        <div style="flex:1;display:flex;gap:34px;padding:24px 60px 30px;min-height:0">
          <div style="flex:0 0 500px;display:flex;align-items:flex-start;justify-content:center;background:#f2ede3;border:1px solid #eae3d6;border-radius:14px;padding:20px;overflow:hidden">
            <img src="${ev.img}" style="max-width:100%;max-height:452px;border-radius:10px;box-shadow:0 12px 34px rgba(39,37,37,.18)">
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:14px">
            ${[['Gatilho','#8f682a',ev.gatilho],['Destinatário','#33568f',ev.dest],['Assunto do e-mail','#1f6b5e',ev.subject]].map(([k,c,v])=>`
              <div style="background:#faf7f0;border:1px solid #eae3d6;border-radius:12px;padding:14px 16px">
                <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${c}">${k}</div>
                <div style="font-size:15px;color:#272525;margin-top:5px;line-height:1.4;font-weight:${k==='Assunto do e-mail'?600:500}">${esc(v)}</div></div>`).join('')}
            <div style="background:#272525;border-radius:12px;padding:16px 18px;flex:1">
              <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#e3bf7e">Contexto de negócio</div>
              <div style="font-size:15px;color:#f1ece2;margin-top:7px;line-height:1.55">${esc(ev.contexto)}</div></div>
          </div>
        </div>
        <div style="position:absolute;right:34px;bottom:20px;font-size:12px;color:#b0a795">${esc(w.nome)} · e-mail ${n}/${totalEv}</div>
      </div>`));
  }
}

// Encerramento
slides.push(S(`
  <div style="position:absolute;inset:0;background:radial-gradient(1000px 500px at 20% 120%,#3a2f1c,#272525 60%,#1c1a18)"></div>
  <div style="position:absolute;left:70px;top:70px;display:flex;align-items:center;gap:14px">${logo(46,19)}<div style="font-family:Georgia,serif;font-weight:700;font-size:15px;letter-spacing:.12em;color:#fff">CIDADE IMPERIAL</div></div>
  <div style="position:absolute;left:70px;top:210px;right:70px">
    <div style="font-size:15px;font-weight:700;letter-spacing:.16em;color:#e3bf7e">COMO ATIVAR</div>
    <div style="font-size:40px;font-weight:800;color:#fff;margin:12px 0 26px">Ligue os e-mails em 3 passos</div>
    <div style="display:flex;gap:16px">
      ${[['1','Configurar','Loja › Configurações Técnicas › Configuração de e-mail: informe servidor SMTP, remetente e o e-mail interno da Loja.'],
         ['2','Ativar e testar','Ative o envio, clique em Verificar conexão e Enviar e-mail de teste para validar.'],
         ['3','Operar','A partir daí, cada ação de pedidos, cotações, faturamento e royalties dispara o e-mail certo automaticamente.']]
        .map(([nn,t,s])=>`<div style="flex:1;background:#ffffff0d;border:1px solid #ffffff22;border-radius:14px;padding:20px 18px">
          <div style="width:34px;height:34px;border-radius:50%;background:#B38335;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:16px">${nn}</div>
          <div style="font-size:17px;font-weight:700;color:#fff;margin:12px 0 6px">${t}</div>
          <div style="font-size:13.5px;color:#c9c1b4;line-height:1.5">${s}</div></div>`).join('')}
    </div>
    <div style="font-size:13px;color:#8a8378;margin-top:34px">Enquanto o envio permanece desativado, nenhum e-mail é disparado — ideal para homologação.</div>
  </div>
`));

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:1280px 720px;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#fff;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.slide{width:1280px;height:720px;position:relative;overflow:hidden;page-break-after:always}
.slide:last-child{page-break-after:auto}
</style></head><body>${slides.join('')}</body></html>`;
writeFileSync('/tmp/claude-0/-home-user-P018LJCDI/c5c10de0-ae73-5d88-b866-fe641e3f1fc6/scratchpad/deck.html', html);

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.setContent(html, { waitUntil:'networkidle' });
await page.pdf({ path:OUT, width:'1280px', height:'720px', printBackground:true, preferCSSPageSize:true });
await browser.close();
console.log('slides:', slides.length, '→', OUT);
