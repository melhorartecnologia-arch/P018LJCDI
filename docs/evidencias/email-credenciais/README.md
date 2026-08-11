# Template de e-mail — credenciais de primeiro acesso

Evento `usuario_credenciais`, definido em `server/src/email-templates.js`.
As imagens são renderizadas pelo próprio `renderTemplate` do servidor, então
refletem o HTML que sai de verdade — não são maquetes.

**Quando dispara:** ao criar um usuário (com o interruptor "Enviar por e-mail os
dados de acesso para o primeiro login?" ligado), ao redefinir a senha na edição
do usuário e no reenvio pela lista de Usuários e permissões.

| Arquivo | O que mostra |
|---|---|
| `00-resumo.png` | Folha comparativa: como chega na caixa de entrada, as duas variantes lado a lado e o que o e-mail carrega |
| `01-email-primeiro-acesso.png` | Variante de **criação** — perfil Revenda com dois vínculos (grupo econômico) |
| `02-email-reenvio.png` | Variante de **reenvio** — título e abertura próprios, avisando que a senha foi redefinida |
| `03-email-fornecedor.png` | Perfil **Fornecedor** — o vínculo acompanha o perfil |
| `04-email-loja-sem-vinculo.png` | Perfil **Loja** — sem vínculo, a linha nem aparece no e-mail |

Os `.html` ao lado de cada PNG são o corpo exato da mensagem, úteis para abrir
no navegador ou colar num cliente de e-mail para teste de renderização.

O PDF consolidado fica em
`docs/Plataforma-Cidade-Imperial-Template-Email-Credenciais.pdf`.

## Assuntos

| Variante | Assunto |
|---|---|
| Criação | `Seu acesso à Plataforma Cidade Imperial` |
| Reenvio | `Seus novos dados de acesso à Plataforma Cidade Imperial` |

## Regenerar

```bash
node docs/gerador/15-build-email-credenciais.mjs
```

Não precisa da aplicação no ar: o script importa o template direto do servidor.
