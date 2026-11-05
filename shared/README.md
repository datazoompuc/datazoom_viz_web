# `web/shared/`

Peças reaproveitáveis entre os apps estáticos. Existe para um app novo não
começar copiando 950 linhas de CSS do app anterior.

## O que tem

| Arquivo | O que é |
|---|---|
| `base.css` | A casca: esqueleto de duas colunas, controles da barra lateral, alternador de idioma, estados de carregando e de erro |
| `util.js` | Funções puras: escape de HTML, fetch de JSON, formatação de número por idioma, chave de busca sem acento |
| `img/` | Logo do Data Zoom |

## Como começar um app novo

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>…</title>
  <link rel="stylesheet" href="../shared/base.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="apppanel">
    <div class="menucol">
      <h2 class="plot_name"></h2>
      <p class="plot_desc"></p>
      <hr>
      <!-- controles -->
      <div class="menucol-logo" role="img" aria-label="Data Zoom"></div>
    </div>
    <div class="plotcol">
      <button id="lang-toggle" class="lang-toggle-corner">…</button>
      <div class="plot-title" id="plot-title"></div>
      <div class="plot-subtitle" id="plot-subtitle"></div>
      <div class="chart-wrap">
        <div id="spinner" class="spinner"></div>
        <!-- painéis -->
      </div>
    </div>
  </div>
  <script src="../shared/util.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

A ordem dos `<link>` importa: o `style.css` do app vem depois e sobrescreve
o que precisar. Para mudar a paleta, redefina as variáveis no `:root` do app
em vez de editar o `base.css`.

## Classes que o `base.css` oferece

**Estrutura:** `.apppanel`, `.menucol`, `.plotcol`, `.chart-wrap`, `.spacer`,
`.menucol-logo`

**Cabeçalho:** `.plot_name`, `.plot_desc`, `.plot-title`, `.plot-subtitle`

**Controles:** `.vars` (rótulo de seção), `.var_selec_group`,
`.sidebar-field` (select e input), `.view-toggle` (+ `.view-toggle-2` para
alternância binária), `.view-btn` (+ `.active`), `.icon-btn`, `.switch-row`

**Estados:** `.spinner` (+ `.hidden`), `.fatal-error`, `.fatal-error-text`,
`.retry-btn`

**Utilitária:** `.hidden`

## Os apps atuais usam só a logo

O `comex_exp_municipio` e o `map_dz_munic_cempre` nasceram antes do
`base.css` e carregam as próprias cópias do CSS. A única coisa daqui que o
de COMEX já usa é a `img/`, porque a logo era idêntica nos dois e não fazia
sentido manter três cópias do mesmo PNG no repositório.

Tentei migrar o de COMEX recortando o CSS dele para cá e o layout quebrou:
o recorte automático fundiu regras e o título herdou propriedades da área do
gráfico. Revertido, e o app voltou a ficar pixel a pixel igual ao que estava.

Se um dia valer migrar, o caminho é trocar um bloco por vez conferindo a
tela a cada passo, não de uma vez só. O ganho é arrumação; o risco é quebrar
app no ar. Para os apps novos a conta é outra, porque não há nada a quebrar.
