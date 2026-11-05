/* Utilitários compartilhados pelos apps estáticos do Data Zoom Amazônia.
 *
 * Só funções puras: nada aqui lê estado de app. O que depende de idioma
 * ou de medida recebe isso por parâmetro, justamente para o arquivo não
 * criar acoplamento entre apps que evoluem em ritmos diferentes.
 *
 * PARA UM APP NOVO, antes do app.js:
 *
 *   <script src="../shared/util.js"></script>
 *   <script src="app.js"></script>
 *
 * Expõe um único global, DZ, para não poluir o escopo:
 *
 *   DZ.escapeHtml(s)
 *   DZ.fetchJson(url)
 *   DZ.numLocale(lang)
 *   DZ.fmtNumber(x, lang)
 *   DZ.fmtAbbrev(x, lang, { prefixo, sufixos })
 *   DZ.searchKey(s)
 *
 * OS APPS EXISTENTES NÃO USAM ISTO. O comex_exp_municipio e o
 * map_dz_munic_cempre têm as próprias cópias dessas funções, de antes
 * deste arquivo existir. Migrá-los é seguro (as implementações são
 * idênticas) mas não é urgente; o valor aqui é o próximo app não começar
 * copiando.
 */

window.DZ = (function () {
  "use strict";

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Falha alto em vez de devolver HTML de erro como se fosse JSON.
  function fetchJson(url) {
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json();
    });
  }

  // pt-BR e en-US trocam os dois separadores, então número na convenção
  // errada não fica só estranho: "1.234" é mil para um leitor e 1,234
  // para o outro.
  function numLocale(lang) {
    return lang === "en" ? "en-US" : "pt-BR";
  }

  function fmtNumber(x, lang, casas) {
    if (x === null || x === undefined || Number.isNaN(x)) return "";
    return Number(x).toLocaleString(numLocale(lang), {
      maximumFractionDigits: casas === undefined ? 0 : casas
    });
  }

  // Número abreviado para espaços apertados (linha de ranking, tooltip).
  // `prefixo` vai antes (ex.: "US$ "), `sufixos` nomeia cada magnitude a
  // partir de mil. O padrão é a convenção pt-BR de valor.
  function fmtAbbrev(x, lang, opcoes) {
    if (x === null || x === undefined || Number.isNaN(x)) return "";
    const o = opcoes || {};
    const prefixo = o.prefixo === undefined ? "" : o.prefixo;
    const sufixos = o.sufixos || { mil: "mil", mi: "mi", bi: "bi" };
    const abs = Math.abs(x);
    const um = (v) => v.toLocaleString(numLocale(lang), {
      minimumFractionDigits: 1, maximumFractionDigits: 1
    });
    if (abs >= 1e9) return prefixo + um(x / 1e9) + " " + sufixos.bi;
    if (abs >= 1e6) return prefixo + um(x / 1e6) + " " + sufixos.mi;
    if (abs >= 1e3) return prefixo + um(x / 1e3) + " " + sufixos.mil;
    return prefixo + fmtNumber(x, lang);
  }

  // Chave de busca sem acento e em minúscula, para "belem" achar "Belém".
  // Ninguém digita diacrítico procurando numa lista de 450 municípios.
  function searchKey(s) {
    return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  return { escapeHtml, fetchJson, numLocale, fmtNumber, fmtAbbrev, searchKey };
})();
