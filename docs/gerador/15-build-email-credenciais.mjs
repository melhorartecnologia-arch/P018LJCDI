// Renderiza o template de e-mail das credenciais de primeiro acesso
// (evento `usuario_credenciais`) nas duas variantes — criação e reenvio —
// direto do renderTemplate do servidor, para servir de evidência visual.
import { chromium } from 'playwright'
import { renderTemplate } from '../../server/src/email-templates.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(here, '../evidencias/email-credenciais')
mkdirSync(DIR, { recursive: true })

const URL_PLATAFORMA = 'https://lojacidadeimperial.cervejariacidadeimperial.com.br'

const CASOS = [
  {
    nome: '01-email-primeiro-acesso',
    titulo: 'Criação do usuário — primeiro acesso',
    vars: {
      nome: 'Marina Duarte', email: 'marina@bardoimperador.com.br', senha: 'Kmqzr483',
      perfil: 'Revenda', vinculo: 'Bar do Imperador · Choperia Alto da Serra',
      url: URL_PLATAFORMA, reenvio: false,
    },
  },
  {
    nome: '02-email-reenvio',
    titulo: 'Reenvio de acesso — nova senha inicial',
    vars: {
      nome: 'Marina Duarte', email: 'marina@bardoimperador.com.br', senha: 'Tsast385',
      perfil: 'Revenda', vinculo: 'Bar do Imperador · Choperia Alto da Serra',
      url: URL_PLATAFORMA, reenvio: true,
    },
  },
  {
    nome: '03-email-fornecedor',
    titulo: 'Perfil Fornecedor — o vínculo acompanha o perfil',
    vars: {
      nome: 'Distribuidora Serra Verde', email: 'comercial@serraverde.com.br', senha: 'Bazyc693',
      perfil: 'Fornecedor', vinculo: 'Distribuidora Serra Verde',
      url: URL_PLATAFORMA, reenvio: false,
    },
  },
  {
    nome: '04-email-loja-sem-vinculo',
    titulo: 'Perfil Loja — sem vínculo, a linha nem aparece',
    vars: {
      nome: 'Carlos Mota', email: 'carlos@cidadeimperial.com.br', senha: 'Vkvek594',
      perfil: 'Loja Cidade Imperial', vinculo: '',
      url: URL_PLATAFORMA, reenvio: false,
    },
  },
]

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true })

// 1) Cada e-mail isolado, como chega na caixa de entrada.
for (const c of CASOS) {
  const { subject, html } = renderTemplate('usuario_credenciais', c.vars)
  // viewport baixo + fullPage: a imagem cresce só até o fim do conteúdo
  const pg = await br.newPage({ viewport: { width: 640, height: 200 }, deviceScaleFactor: 2 })
  await pg.setContent(html)
  await pg.waitForTimeout(200)
  await pg.screenshot({ path: resolve(DIR, c.nome + '.png'), fullPage: true })
  await pg.close()
  writeFileSync(resolve(DIR, c.nome + '.html'), html)
  console.log(c.nome, '·', subject)
}

// 2) Folha comparativa: a caixa de entrada, os dois assuntos e o e-mail em contexto.
const cria = renderTemplate('usuario_credenciais', CASOS[0].vars)
const reen = renderTemplate('usuario_credenciais', CASOS[1].vars)
const GOLD = '#B38335', DARK = '#272525'
const caixa = (assunto, quando, ativo) => `
  <div style="display:flex;gap:12px;padding:13px 16px;border-bottom:1px solid #f1ece2;background:${ativo ? '#faf7f0' : '#fff'}">
    <div style="width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#cfa055,${GOLD} 60%,#8a6428);color:#fff;font-family:Georgia,serif;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex:none">CI</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:12.5px;font-weight:700;color:${DARK}">Cidade Imperial <span style="font-weight:400;color:#a89f90">&lt;plataforma@cidadeimperial.com.br&gt;</span></div>
      <div style="font-size:13px;font-weight:600;color:${DARK};margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${assunto}</div>
      <div style="font-size:11.5px;color:#a89f90;margin-top:1px">Olá, Marina Duarte! Uma conta de acesso foi criada para você…</div>
    </div>
    <div style="font-size:11px;color:#b0a795;white-space:nowrap">${quando}</div>
  </div>`

const folha = `
<div style="width:1400px;background:#f7f4ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${DARK}">
  <div style="background:${DARK};padding:32px 46px 28px;color:#fff">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px">
      <div style="width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,#cfa055,${GOLD} 60%,#8a6428);display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:18px">CI</div>
      <div><div style="font-family:Georgia,serif;font-weight:700;font-size:16px;letter-spacing:.12em">CIDADE IMPERIAL</div>
      <div style="font-size:10px;letter-spacing:.16em;color:#b9b0a2;margin-top:2px">PLATAFORMA DA LOJA</div></div>
      <div style="margin-left:auto;font-size:10.5px;font-weight:700;letter-spacing:.09em;color:#8fd39c;border:1px solid #3f5a45;background:#26332a;border-radius:7px;padding:6px 12px">EM PRODUÇÃO ✓</div>
    </div>
    <div style="font-size:10.5px;font-weight:700;letter-spacing:.16em;color:${GOLD};margin-bottom:8px">TEMPLATE DE E-MAIL · EVENTO usuario_credenciais</div>
    <div style="font-size:30px;font-weight:700;line-height:1.15;margin-bottom:11px">Dados de acesso para o primeiro login</div>
    <div style="font-size:14px;line-height:1.6;color:#c9c1b4;max-width:1040px">Disparado ao criar um usuário (quando o administrador confirma o envio), ao redefinir a senha na edição e no reenvio pela lista. Duas variantes do mesmo template — criação e reenvio — com assunto e texto de abertura próprios.</div>
  </div>

  <div style="padding:28px 46px 8px">
    <div style="font-size:11.5px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:13px">COMO CHEGA NA CAIXA DE ENTRADA</div>
    <div style="background:#fff;border:1px solid #eae3d6;border-radius:12px;overflow:hidden;max-width:900px">
      ${caixa(cria.subject, '10:25', true)}
      ${caixa(reen.subject, '11:40', false)}
    </div>
    <div style="font-size:12px;color:#8a8378;margin-top:9px">Os assuntos distinguem a criação do reenvio, para o usuário não confundir uma senha nova com o e-mail original.</div>
  </div>

  <div style="padding:26px 46px 40px">
    <div style="font-size:11.5px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:15px">AS DUAS VARIANTES, LADO A LADO</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:start">
      ${[[cria, 'Criação do usuário', 'Texto de boas-vindas; a senha é a que o administrador definiu ou gerou no cadastro.'],
         [reen, 'Reenvio de acesso', 'Avisa que a senha foi redefinida pela Loja; a nova senha passa a valer na hora.']]
        .map(([t, tit, sub]) => `
        <div>
          <div style="display:flex;align-items:flex-start;gap:11px;margin-bottom:10px">
            <div style="width:5px;align-self:stretch;background:${GOLD};border-radius:3px;flex:none"></div>
            <div><div style="font-size:14px;font-weight:700">${tit}</div>
            <div style="font-size:12.5px;color:#8a8378;line-height:1.5;margin-top:2px">${sub}</div>
            <div style="font-size:11.5px;color:#8f682a;background:#faf3e4;border:1px solid #e6cf9e;border-radius:6px;padding:4px 9px;margin-top:7px;display:inline-block">Assunto: ${t.subject}</div></div>
          </div>
          <div style="border:1px solid #eae3d6;border-radius:12px;overflow:hidden;background:#f7f4ee">
            <iframe srcdoc="${t.html.replace(/"/g, '&quot;')}" style="width:100%;height:790px;border:0;display:block"></iframe>
          </div>
        </div>`).join('')}
    </div>
  </div>

  <div style="padding:0 46px 40px">
    <div style="font-size:11.5px;font-weight:700;letter-spacing:.13em;color:#a89f90;margin-bottom:14px">O QUE O E-MAIL CARREGA</div>
    <div style="background:#fff;border:1px solid #eae3d6;border-radius:12px;padding:6px 20px">
      ${[['Endereço da plataforma', 'A URL de onde o usuário deve entrar — evita phishing e o "não sei onde acessar".'],
         ['E-mail (login)', 'O próprio endereço de destino, para deixar explícito qual é o usuário de login.'],
         ['Senha inicial', 'A senha definida ou gerada no cadastro. Só trafega neste e-mail: a plataforma guarda apenas o hash.'],
         ['Perfil de acesso', 'Administrador, Loja, Fornecedor ou Revenda — o usuário já sabe o que vai encontrar.'],
         ['Vínculo', 'Fornecedor ou revendas ligadas à conta. A linha é omitida quando não há vínculo (perfis Loja e Administrador).'],
         ['Orientação de segurança', 'Pede a troca da senha no primeiro acesso, lembra que o acesso é pessoal e auditado, e orienta avisar a Loja se o e-mail não era esperado.']]
        .map(([k, v]) => `<div style="display:flex;gap:16px;padding:11px 0;border-bottom:1px solid #f5f1e8">
          <div style="width:210px;flex:none;font-size:13px;font-weight:700">${k}</div>
          <div style="font-size:13px;color:#6b6459;line-height:1.55">${v}</div></div>`).join('')}
    </div>
    <div style="font-size:12px;color:#a89f90;margin-top:11px;line-height:1.6">O envio depende de a Configuração de e-mail (SMTP) estar ativa. Desativada, o usuário é criado normalmente, a tentativa fica registrada como “Não enviado” no histórico do usuário e na auditoria, e a plataforma avisa na hora — mas nenhuma mensagem sai.</div>
  </div>

  <div style="background:${DARK};color:#9c948a;font-size:11px;padding:16px 46px;display:flex;justify-content:space-between">
    <span>Plataforma Cidade Imperial · Cervejaria Cidade Imperial</span>
    <span>Template usuario_credenciais · server/src/email-templates.js</span>
  </div>
</div>`

const pg = await br.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1.5 })
await pg.setContent(folha)
await pg.waitForTimeout(900)
await pg.locator('div').first().screenshot({ path: resolve(DIR, '00-resumo.png') })
await pg.emulateMedia({ media: 'print' })
await pg.pdf({
  path: resolve(here, '../Plataforma-Cidade-Imperial-Template-Email-Credenciais.pdf'),
  width: '1400px', height: '1000px', printBackground: true,
})
await br.close()
console.log('resumo + PDF ok em', DIR)
