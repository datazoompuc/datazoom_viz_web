// Data Zoom Amazônia — app_ts_comex_exp_municipio, JS rebuild PoC
//
// Static rebuild of the Shiny app: data is pre-exported by
// data-raw/export_ts_comex_exp_municipio_web.R into web/ts_comex_exp_municipio/data/.
// Everything below runs client-side against those static files — no R
// server, no shinyapps.io.
//
// Two views so far: a ranked bar chart (top-N municipalities by export
// value for a selected year) and a region-wide composition view (stacked
// area of export value by product category over the whole time range).
// Per-entity trend small multiples and a year-over-year dumbbell view are
// still follow-up work — see the brainstorm in the PR/conversation history
// for the full plan.

(function () {
  "use strict";

  const I18N = {
    pt: {
      plot_name: "Data Zoom Amazônia",
      plot_desc: "Comércio exterior na Amazônia (COMEX): valor da exportação por município",
      label_topn_name: "Municípios exibidos",
      label_year: "Ano",
      label_view_name: "Visualização",
      view_ranking: "Ranking",
      view_composition: "Composição",
      title_ranking: "Ranking de municípios exportadores",
      subtitle_ranking: "Valor exportado (US$), por município",
      title_composition: "Composição das exportações da Amazônia Legal",
      subtitle_composition: "Valor exportado (US$) por categoria de produto, empilhado por ano — passe o mouse para ver o detalhamento",
      ranking_axis_label: "Valor exportado (US$)",
      region_total_prefix: "Total Amazônia Legal: ",
      label_no_data: "Sem dado",
      label_others: "Outros",
      view_change: "Variação",
      title_change: "Variação entre dois anos",
      subtitle_change: "Municípios ordenados pela variação no valor exportado",
      label_state: "Estado",
      label_year_a: "Ano A",
      label_year_b: "Ano B",
      change_axis_label: "Valor exportado (US$)",
      view_trends: "Tendências",
      title_trends: "Tendências por município",
      subtitle_trends: "Top municípios por valor total exportado, 1997–2025",
      label_since_prefix: "Desde ",
      view_explore: "Explorar",
      title_explore: "Comparar municípios",
      subtitle_explore: "Valor exportado (US$) ao longo do tempo, municípios selecionados",
      label_explore_munis: "Municípios (Ctrl/Cmd+clique para vários)",
      explore_hint: "Ordenado por valor total exportado",
      label_log_scale: "Escala logarítmica",
      label_index_first: "Indexado ao ano inicial (=100)",
      explore_no_base: "sem exportação em {year}",
      title_composition_muni: "Composição das exportações — {municipio}",
      subtitle_composition_muni: "Categorias de produto exportadas, 1997–2025 — passe o mouse para ver o detalhamento",
      label_composition_scope: "Escopo",
      composition_scope_region: "Toda a Amazônia Legal",
      title_ranking_product: "Ranking de municípios exportadores — {produto}",
      label_ranking_product_select: "Produto",
      label_ranking_product_search: "Ou busque outro produto (todos os SH4)",
      ranking_product_all: "Todos os produtos",
      ranking_product_custom: "(produto buscado)",
      prodrank_cat_agro: "Agro e alimentos",
      prodrank_cat_carnes: "Carnes e produtos de origem animal",
      prodrank_cat_oleos: "Óleos e derivados",
      prodrank_cat_florestais: "Florestais e madeira",
      prodrank_cat_metais: "Metais e minerais",
      prodrank_cat_industria: "Indústria e manufaturados",
      ranking_product_total_prefix: "Total exportado no ano: ",
      label_loading: "Carregando…",
      view_map: "Mapa",
      label_map_mode: "VARIÁVEIS:",
      map_mode_forest: "Compatíveis c/ Floresta",
      map_mode_all: "Todos os Produtos",
      map_mode_ratio: "Razão Floresta/Outros",
      title_map_forest: "Principal produto compatível com a floresta",
      title_map_all: "Principal produto exportado",
      title_map_ratio: "Floresta vs. outros produtos",
      subtitle_map_forest: "Município colorido pela categoria do seu principal produto compatível com a floresta, por ano",
      subtitle_map_all: "Município colorido pela categoria do seu principal produto exportado, por ano",
      subtitle_map_ratio: "Compara o produto mais exportado do município com seu produto mais exportado entre os compatíveis com a floresta — qual dos dois é mais característico da Amazônia Legal?",
      map_hint: "Passe o mouse sobre um município para ver detalhes.",
      map_loading: "Carregando mapa…",
      tooltip_municipio: "Município:",
      tooltip_estado: "Estado:",
      tooltip_produto: "Principal produto:",
      tooltip_produto_geral: "Produto mais exportado (geral):",
      tooltip_produto_floresta: "Produto mais exportado (floresta):",
      tooltip_categoria: "Categoria:",
      tooltip_valor: "Valor:",
      tooltip_valor_unidade: "% das exportações desse produto na Amazônia Legal vindas deste município",
      tooltip_classe: "Classificação:",
      ratio_same: "Mesmo produto principal",
      ratio_nao: "Principal produto não é compatível com a floresta",
      ratio_sim: "Principal produto é compatível com a floresta",
      legend_title_category: "Categoria do principal produto",
      legend_title_ratio: "Classificação",
      btn_lang: "English"
    },
    en: {
      plot_name: "Data Zoom Amazônia",
      plot_desc: "External trade in the Amazon (COMEX): export value by municipality",
      label_topn_name: "Municipalities shown",
      label_year: "Year",
      label_view_name: "View",
      view_ranking: "Ranking",
      view_composition: "Composition",
      title_ranking: "Ranking of exporting municipalities",
      subtitle_ranking: "Export value (US$), by municipality",
      title_composition: "Legal Amazon export composition",
      subtitle_composition: "Export value (US$) by product category, stacked per year — hover to see the breakdown",
      ranking_axis_label: "Export value (US$)",
      region_total_prefix: "Legal Amazon total: ",
      label_no_data: "No data",
      label_others: "Other",
      view_change: "Change",
      title_change: "Change between two years",
      subtitle_change: "Municipalities ranked by change in export value",
      label_state: "State",
      label_year_a: "Year A",
      label_year_b: "Year B",
      change_axis_label: "Export value (US$)",
      view_trends: "Trends",
      title_trends: "Trends by municipality",
      subtitle_trends: "Top municipalities by total export value, 1997–2025",
      label_since_prefix: "Since ",
      view_explore: "Explore",
      title_explore: "Compare municipalities",
      subtitle_explore: "Export value (US$) over time, selected municipalities",
      label_explore_munis: "Municipalities (Ctrl/Cmd+click for multiple)",
      explore_hint: "Sorted by total export value",
      label_log_scale: "Log scale",
      label_index_first: "Indexed to first year (=100)",
      explore_no_base: "no exports in {year}",
      title_composition_muni: "Export composition — {municipio}",
      subtitle_composition_muni: "Product categories exported, 1997–2025 — hover to see the breakdown",
      label_composition_scope: "Scope",
      composition_scope_region: "Whole Legal Amazon",
      title_ranking_product: "Ranking of exporting municipalities — {produto}",
      label_ranking_product_select: "Product",
      label_ranking_product_search: "Or search another product (all SH4)",
      ranking_product_all: "All products",
      ranking_product_custom: "(searched product)",
      prodrank_cat_agro: "Agriculture & food",
      prodrank_cat_carnes: "Meat & animal products",
      prodrank_cat_oleos: "Oils & derivatives",
      prodrank_cat_florestais: "Forestry & wood",
      prodrank_cat_metais: "Metals & minerals",
      prodrank_cat_industria: "Industry & manufactured goods",
      ranking_product_total_prefix: "Total exported that year: ",
      label_loading: "Loading…",
      view_map: "Map",
      label_map_mode: "VARIABLES:",
      map_mode_forest: "Forest Compatible",
      map_mode_all: "All Products",
      map_mode_ratio: "Forest/Other Ratio",
      title_map_forest: "Main forest-compatible product",
      title_map_all: "Main exported product",
      title_map_ratio: "Forest vs. other products",
      subtitle_map_forest: "Municipality colored by its main forest-compatible product's category, by year",
      subtitle_map_all: "Municipality colored by its main exported product's category, by year",
      subtitle_map_ratio: "Compares the municipality's overall top export with its top export among forest-compatible goods — which one is more distinctively theirs, region-wide?",
      map_hint: "Hover over a municipality to see details.",
      map_loading: "Loading map…",
      tooltip_municipio: "Municipality:",
      tooltip_estado: "State:",
      tooltip_produto: "Main product:",
      tooltip_produto_geral: "Top export (overall):",
      tooltip_produto_floresta: "Top export (forest-compatible):",
      tooltip_categoria: "Category:",
      tooltip_valor: "Value:",
      tooltip_valor_unidade: "% of that product's Legal Amazon exports that came from this municipality",
      tooltip_classe: "Classification:",
      ratio_same: "Same main product",
      ratio_nao: "Main product is not forest-compatible",
      ratio_sim: "Main product is forest-compatible",
      legend_title_category: "Main product's category",
      legend_title_ratio: "Classification",
      btn_lang: "Português"
    }
  };

  // Okabe-Ito — a published, colorblind-safe 8-hue categorical palette.
  // Assigned once, in a fixed order, to the top-8 products by all-time
  // total value; every other category folds into "Outros"/"Other" (a
  // neutral gray, not a 9th hue). Order is fixed regardless of how a
  // product's per-year rank moves — color follows the entity, never its
  // rank in a given year.
  const CATEGORY_COLORS = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7", "#666666"];
  const OTHERS_COLOR = "#c9c4ba";

  const DATA_DIR = "data";
  const PLAY_INTERVAL_MS = 900;
  const SPARK_W = 260;
  const SPARK_H = 40;
  const SPARK_PAD = 4;

  const state = {
    lang: "pt",
    year: null,
    topN: 15,
    view: "ranking", // "ranking" | "composition" | "change" | "trends" | "explore"
    playing: false,
    playTimer: null,
    changeState: null, // UF filter for the change (dumbbell) view
    yearA: null,
    yearB: null,
    exploreMunis: [], // hand-picked municipalities for the explore view
    exploreLog: false,
    exploreIndex: false,
    compositionScope: null, // null = whole-region composition; a municipio name = that place's own composition
    rankingProduct: null, // null = ranked by total across all products; a SH4 code = ranked by that product only
    mapMode: "forest" // "forest" | "all" | "ratio" — shares state.year with the rest of the app
  };

  let dictionary, municipalityTotals, regionTotals, composition, products, muniComposition;
  let totalsByYear; // year -> [{municipio, valor}], sorted descending
  let regionTotalByYear; // year -> valor
  let compositionSeries; // [{ produto, color, isOthers, values: Map(year -> valor) }], top-8 + Outros, fixed order
  let totalsByMunicipio; // municipio -> Map(year -> valor)
  let municipioMeta; // municipio -> { uf }
  let ufList; // sorted distinct UF codes
  let muniCompositionRowsByMuni; // municipio -> [{produto, ano, valor}], only municipalities with any exports
  let activeCompositionSeries; // whichever series (region or a municipio) is currently rendered, for the hover handler

  // Product-filtered ranking (SH4-level, ~1,142 specific products vs. the 22
  // broad SEC categories used elsewhere) is fetched lazily — it's ~1MB, by
  // far the heaviest dataset in the app, and most visits never pick a
  // specific product (the default "Todos os produtos" needs none of this).
  // Fetch is triggered by interacting with the product picker, not by
  // landing on Ranking (its default view) — see ensureProductRankingLoaded.
  let productRanking = null; // raw {municipios, produtos, cells} once loaded
  let productRankingPromise = null;
  let productRankingRowsByCode; // code -> [{municipio, ano, valor}]
  let productsByCode; // code -> {code, label_pt, label_en}, once loaded
  let rankingProductLabelToCode; // current-language short label -> code, for the datalist picker

  // Map view (Leaflet): lazy-loaded on first visit, same rationale as the
  // product ranking data — this is ~6MB (mostly state-boundary geometry)
  // and most visits never open this view. Both the Leaflet library itself
  // (CSS+JS, injected on demand — see ensureLeafletLoaded) and the map's
  // own data stay out of every other view's cost entirely.
  let leafletLoadPromise = null;
  let mapDataPromise = null;
  let mapData; // {municipios, categorias, produtos, cells}
  let mapCellByKey; // "municipioIdx|ano|floresta" -> {categoriaIdx, produtoIdx, valor}
  let leafletMap, mapLegendControl;
  let mapLayersByCodIbge;
  const MAP_NODATA_PATTERN_ID = "nodata-hatch";
  const MAP_NODATA_BASE = "#deeaef";
  const MAP_NODATA_LINE = "#a2adb1";
  const MAP_RATIO_COLORS = { same: "#666666", nao: "#D55E00", sim: "#009E73" };

  let sparkSeries = [];
  let sparkXFor = null;
  let sparkYFor = null;

  Promise.all([
    fetchJson(`${DATA_DIR}/dictionary.json`),
    fetchJson(`${DATA_DIR}/municipality_totals.json`),
    fetchJson(`${DATA_DIR}/region_totals.json`),
    fetchJson(`${DATA_DIR}/composition.json`),
    fetchJson(`${DATA_DIR}/products.json`),
    fetchJson(`${DATA_DIR}/municipality_composition.json`)
  ]).then(([dict, munTotals, regTotals, comp, prod, muniComp]) => {
    dictionary = dict;
    municipalityTotals = munTotals;
    regionTotals = regTotals;
    composition = comp;
    products = prod;
    muniComposition = muniComp;

    totalsByYear = groupByYear(municipalityTotals);
    regionTotalByYear = new Map(regionTotals.map((r) => [r.ano, r.valor]));
    compositionSeries = buildCompositionSeries(composition, dictionary);
    activeCompositionSeries = compositionSeries;
    ({ totalsByMunicipio, municipioMeta, ufList } = buildMunicipioIndex(municipalityTotals));
    muniCompositionRowsByMuni = buildMuniCompositionIndex(muniComposition);

    initState();
    initControls();
    initSparklineHover();
    initCompositionHover();
    initExploreHover();
    setView(state.view);
    document.getElementById("spinner").classList.add("hidden");
  }).catch((err) => {
    console.error("Failed to load data", err);
    document.getElementById("spinner").classList.add("hidden");
    alert("Failed to load app data — see console. Did you run the export script and serve this folder over HTTP?");
  });

  function fetchJson(url) {
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json();
    });
  }

  function groupByYear(rows) {
    const byYear = new Map();
    for (const row of rows) {
      if (!byYear.has(row.ano)) byYear.set(row.ano, []);
      byYear.get(row.ano).push(row);
    }
    for (const list of byYear.values()) list.sort((a, b) => b.valor - a.valor);
    return byYear;
  }

  // The source data keys municipalities by a "Nome - UF" string (the .rds
  // pipeline discards the IBGE code in favor of this name early on — see
  // the export script) — UF is parsed from that suffix rather than
  // re-fetched from anywhere else, same pattern the CEMPRE map used for
  // its own compare-mode state filter.
  function buildMunicipioIndex(rows) {
    const byMuni = new Map();
    const meta = new Map();
    for (const row of rows) {
      if (!byMuni.has(row.municipio)) {
        byMuni.set(row.municipio, new Map());
        const uf = row.municipio.slice(row.municipio.lastIndexOf(" - ") + 3);
        meta.set(row.municipio, { uf });
      }
      byMuni.get(row.municipio).set(row.ano, row.valor);
    }
    const ufs = Array.from(new Set(Array.from(meta.values()).map((m) => m.uf))).sort();
    return { totalsByMunicipio: byMuni, municipioMeta: meta, ufList: ufs };
  }

  // municipality_composition.json ships as index-referencing [municipio_idx,
  // produto_idx, ano, valor] cells (zero-value cells dropped) rather than
  // one JSON object per municipio x produto x year — the full grid is 96%
  // zero, so this cuts the payload from ~285k rows to ~18k. Expand once
  // into the same {produto, ano, valor} row shape buildCompositionSeries()
  // already consumes for the region-wide chart.
  function buildMuniCompositionIndex(data) {
    const byMuni = new Map();
    for (const [municipioIdx, produtoIdx, ano, valor] of data.cells) {
      const municipio = data.municipios[municipioIdx];
      const produto = data.produtos[produtoIdx];
      if (!byMuni.has(municipio)) byMuni.set(municipio, []);
      byMuni.get(municipio).push({ produto, ano, valor });
    }
    return byMuni;
  }

  // ---- Product ranking (SH4): lazy-loaded on first visit to that view ----

  // The original app_rk_comex_exp_munic_produtosamz didn't expose all ~1,142
  // SH4 codes either — its server.R hand-curated this ~35-item, 6-category
  // "starter_choices" list (ported verbatim, codes only; labels come from
  // our own bilingual productsByCode lookup instead of its PT-only custom
  // strings, so the category picker stays correct under the lang toggle).
  // The full catalog stays reachable via the separate search input for
  // anyone looking for something outside this curated set.
  const PRODRANK_CATEGORIES = [
    { key: "agro", codes: ["1201", "1005", "0713", "0710", "0702", "0707", "1104", "1904", "2005", "2008", "2201", "2101"] },
    { key: "carnes", codes: ["0202", "0201", "0206", "0504", "1502", "2301"] },
    { key: "oleos", codes: ["1507"] },
    { key: "florestais", codes: ["4407", "4409", "0801"] },
    { key: "metais", codes: ["7108", "5201"] },
    { key: "industria", codes: ["7318", "8482", "4818", "6204", "4202", "3006"] }
  ];

  // Hardcoded short labels for exactly the curated codes above (same
  // clause-truncation rule as rankingProductShortLabel, pre-computed from
  // auxiliar_cod_sh4.rds). This lets the curated dropdown render correctly
  // on Ranking's default load with zero network cost — Ranking is the
  // app's landing view, so eagerly fetching the 1MB product_ranking.json
  // just to populate this list would defeat the whole point of it being
  // lazy. SH4 nomenclature is a fixed international standard, not
  // something that changes with each Comex data refresh, so this snapshot
  // going stale is not a practical concern.
  const PRODRANK_CURATED_LABELS = {
    "1201": { pt: "Soja, mesmo triturada", en: "Soya beans, whether or not broken" },
    "1005": { pt: "Milho", en: "Maize (corn)" },
    "0713": { pt: "Legumes de vagem, secos, em grão, mesmo pelados ou partidos", en: "Dried leguminous vegetables, shelled, whether or not skin…" },
    "0710": { pt: "Produtos hortícolas, não cozidos ou cozidos em água ou va…", en: "Vegetables (uncooked or cooked by steaming or boiling in …" },
    "0702": { pt: "Tomates, frescos ou refrigerados", en: "Tomato, fresh or chilled" },
    "0707": { pt: "Pepinos e pepininhos (cornichons), frescos ou refrigerados", en: "Cucumbers and gherkins, fresh or chilled" },
    "1104": { pt: "Grãos de cereais trabalhados de outro modo (por exemplo: …", en: "Cereal grains otherwise worked (for example, hulled, roll…" },
    "1904": { pt: "Produtos à base de cereais, obtidos por expansão ou por t…", en: "Prepared foods obtained by the swelling or roasting of ce…" },
    "2005": { pt: "Outros produtos hortícolas preparados ou conservados, exc…", en: "Other vegetables prepared or preserved otherwise than by …" },
    "2008": { pt: "Frutas e outras partes comestíveis de plantas, preparadas…", en: "Fruit, nuts and other edible parts of plants, otherwise p…" },
    "2201": { pt: "Águas, incluídas as águas minerais, naturais ou artificia…", en: "Waters, including natural or artificial mineral waters an…" },
    "2101": { pt: "Extractos, essências e concentrados de café, chá ou de ma…", en: "Extracts, essences and concentrates, of coffee, tea or ma…" },
    "0202": { pt: "Carnes de animais da espécie bovina, congeladas", en: "Meat of bovine animals, frozen" },
    "0201": { pt: "Carnes de animais da espécie bovina, frescas ou refrigeradas", en: "Meat of bovine animals, fresh or chilled" },
    "0206": { pt: "Miudezas comestíveis de animais das espécies bovina, suín…", en: "Edible offal of bovine animals, swine, sheep, goats, hors…" },
    "0504": { pt: "Tripas, bexigas e estômagos de animais, exceto peixes, in…", en: "Animal (not fish) guts, bladders, stomachs and parts" },
    "1502": { pt: "Gorduras de animais das espécies bovina, ovina ou caprina…", en: "Fats of bovine animals, sheep or goats, other than those …" },
    "2301": { pt: "Farinhas, pó e pellets, de carnes, miudezas, peixes ou cr…", en: "Flours, meals and pellets, of meat or meat offal, of fish…" },
    "1507": { pt: "Óleo de soja e respectivas fracções, mesmo refinados, mas…", en: "Soya-bean oil and its fractions, whether or not refined, …" },
    "4407": { pt: "Madeira serrada ou endireitada longitudinalmente, cortada…", en: "Wood sawn or chipped lengthwise, sliced or peeled, whethe…" },
    "4409": { pt: "Madeira (incluídos os tacos e frisos para soalhos, não mo…", en: "Wood (including strips and friezes for parquet flooring, …" },
    "0801": { pt: "Cocos, castanha do Brasil e castanha de caju, frescos ou …", en: "Coconuts, Brazil nuts and cashew nuts, fresh or dried, wh…" },
    "7108": { pt: "Ouro (incluído o ouro platinado), em formas brutas ou sem…", en: "Gold (including gold plated with platinum), unwrought or …" },
    "5201": { pt: "Algodão, não cardado nem penteado", en: "Cotton, not carded or combed" },
    "7318": { pt: "Parafusos, pernos ou pinos, roscados, porcas, tira-fundos…", en: "Screws, bolts, nuts, coach screws, screw hooks, rivets, c…" },
    "8482": { pt: "Rolamentos de esferas, de roletes ou de agulhas", en: "Ball or roller bearings" },
    "4818": { pt: "Papel dos tipos utilizados para a fabricação de papéis hi…", en: "Toilet paper and similar paper, cellulose wadding or webs…" },
    "6204": { pt: "Fatos de saia-casaco, conjuntos, casacos, vestidos, saias…", en: "Women's or girls' suits, ensembles, jackets, blazers, dre…" },
    "4202": { pt: "Malas e maletas, incluídas as de toucador e as maletas e …", en: "Trunks, suit-cases, vanity-cases, executive-cases, brief-…" },
    "3006": { pt: "Preparações e artigos farmacêuticos indicados na Nota 4 d…", en: "Pharmaceutical goods specified in note 4 to this chapter" }
  };

  function ensureProductRankingLoaded() {
    if (productRankingPromise) return productRankingPromise;
    productRankingPromise = fetchJson(`${DATA_DIR}/product_ranking.json`).then((data) => {
      productRanking = data;
      productsByCode = new Map(data.produtos.map((p) => [p.code, p]));
      productRankingRowsByCode = buildProductRankingIndex(data);
      if (state.rankingProduct && !productRankingRowsByCode.has(state.rankingProduct)) {
        state.rankingProduct = null;
        updateUrl();
      }
      populateRankingProductPicker();
    });
    return productRankingPromise;
  }

  function buildProductRankingIndex(data) {
    const byCode = new Map();
    for (const [produtoIdx, municipioIdx, ano, valor] of data.cells) {
      const code = data.produtos[produtoIdx].code;
      const municipio = data.municipios[municipioIdx];
      if (!byCode.has(code)) byCode.set(code, []);
      byCode.get(code).push({ municipio, ano, valor });
    }
    return byCode;
  }

  // Full official name — only available once product_ranking.json has
  // loaded (needed for the on-chart/tooltip display, not the picker).
  function rankingProductLabel(code) {
    const p = productsByCode && productsByCode.get(code);
    if (!p) return code;
    return state.lang === "en" ? p.label_en : p.label_pt;
  }

  // Short label for the picker: uses the hardcoded curated snapshot when
  // the full dataset isn't loaded yet (so the dropdown works with zero
  // fetch), the live official data once it is. Same clause-boundary
  // truncation rule either way — official SH4 customs descriptions are
  // long (median ~107 chars, max 255) and compound-clause-shaped, just
  // like the SEC product names.
  function rankingProductShortLabel(code) {
    if (productsByCode) {
      const full = rankingProductLabel(code);
      const clause = full.split(";")[0].trim();
      return clause.length > 60 ? clause.slice(0, 57).trimEnd() + "…" : clause;
    }
    const curated = PRODRANK_CURATED_LABELS[code];
    return curated ? curated[state.lang] : code;
  }

  // Curated dropdown works before the 1MB dataset loads (labels come from
  // PRODRANK_CURATED_LABELS) — safe to call at init and again after load
  // (rankingProductShortLabel switches to the live official data once
  // productsByCode exists, so re-running this just refreshes to the same
  // values plus whatever's needed for a lang change).
  function populateCuratedSelect() {
    const t = I18N[state.lang];
    const select = document.getElementById("ranking-product-select");
    select.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = t.ranking_product_all;
    select.appendChild(allOpt);
    for (const cat of PRODRANK_CATEGORIES) {
      const group = document.createElement("optgroup");
      group.label = t[`prodrank_cat_${cat.key}`];
      const items = cat.codes
        .map((code) => ({ code, label: rankingProductShortLabel(code) }))
        .sort((a, b) => a.label.localeCompare(b.label, state.lang));
      for (const { code, label } of items) {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = label;
        group.appendChild(opt);
      }
      select.appendChild(group);
    }
    syncRankingProductControls();
  }

  // Full-catalog search — only possible once product_ranking.json is
  // loaded, since it needs every code's label, not just the curated 30.
  function populateRankingProductPicker() {
    populateCuratedSelect();

    const datalist = document.getElementById("ranking-product-datalist");
    datalist.innerHTML = "";
    rankingProductLabelToCode = new Map();
    const sorted = Array.from(productsByCode.keys())
      .map((code) => ({ code, label: rankingProductShortLabel(code) }))
      .sort((a, b) => a.label.localeCompare(b.label, state.lang));
    for (const { code, label } of sorted) {
      rankingProductLabelToCode.set(label, code);
      const opt = document.createElement("option");
      opt.value = label;
      datalist.appendChild(opt);
    }

    syncRankingProductControls();
  }

  function syncRankingProductControls() {
    const select = document.getElementById("ranking-product-select");
    const existingCustom = select.querySelector('option[value="__custom__"]');
    if (existingCustom) existingCustom.remove();

    if (!state.rankingProduct) {
      select.value = "";
    } else if (Array.from(select.options).some((o) => o.value === state.rankingProduct)) {
      select.value = state.rankingProduct;
    } else {
      // A searched (non-curated) product, or a URL deep link to one — show
      // a distinct marker instead of silently snapping to "Todos os produtos".
      const custom = document.createElement("option");
      custom.value = "__custom__";
      custom.textContent = I18N[state.lang].ranking_product_custom;
      // select.children[1] is the first <optgroup> (a direct child of
      // <select>) — select.options[1] would instead be that optgroup's
      // first nested <option>, which insertBefore rejects as not being a
      // direct child of <select>.
      select.insertBefore(custom, select.children[1] || null);
      select.value = "__custom__";
    }

    const input = document.getElementById("ranking-product-input");
    input.value = state.rankingProduct ? rankingProductShortLabel(state.rankingProduct) : "";
    document.getElementById("ranking-product-full-label").textContent =
      state.rankingProduct && productsByCode ? rankingProductLabel(state.rankingProduct) : "";
  }

  // ---- Map (Leaflet, lazy-loaded): a serverless rebuild of the separate
  // original app_map_comex_exp_sh4_sel, folded in here as a view since
  // it's the same COMEX municipality data, just a different lens (top
  // exported product per municipality, colored by category) instead of a
  // ranking/composition/trend. Neither the Leaflet library nor this view's
  // ~6MB dataset load until the view is actually opened. ----

  function ensureLeafletLoaded() {
    if (leafletLoadPromise) return leafletLoadPromise;
    leafletLoadPromise = new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Leaflet"));
      document.head.appendChild(script);
    });
    return leafletLoadPromise;
  }

  function ensureMapDataLoaded() {
    if (mapDataPromise) return mapDataPromise;
    mapDataPromise = Promise.all([
      fetchJson(`${DATA_DIR}/map/map_data.json`),
      fetchJson(`${DATA_DIR}/map/municipalities.geojson`),
      fetchJson(`${DATA_DIR}/map/states_boundary.geojson`),
      fetchJson(`${DATA_DIR}/map/legal_amazon_boundary.geojson`)
    ]).then(([data, municGeo, statesGeo, legalAmazonGeo]) => {
      mapData = data;
      mapCellByKey = new Map();
      for (const [municipioIdx, ano, floresta, categoriaIdx, produtoIdx, valor] of data.cells) {
        mapCellByKey.set(`${municipioIdx}|${ano}|${floresta}`, { categoriaIdx, produtoIdx, valor });
      }
      return { municGeo, statesGeo, legalAmazonGeo };
    });
    return mapDataPromise;
  }

  function ensureMapReady() {
    return Promise.all([ensureLeafletLoaded(), ensureMapDataLoaded()]).then(([, geo]) => {
      if (!leafletMap) initLeafletMap(geo.municGeo, geo.statesGeo, geo.legalAmazonGeo);
    });
  }

  function getMapCell(municipioIdx, ano, floresta) {
    return mapCellByKey.get(`${municipioIdx}|${ano}|${floresta}`);
  }

  // Ratio mode is derived client-side from the forest (floresta=1) and
  // all-products (floresta=0) cells already loaded, mirroring the original
  // app's classe_ratio logic exactly: if either side has no top product
  // that year, there's not enough information to classify (no data) — a
  // municipality with zero forest-compatible exports isn't "not
  // forest-dominant", it's simply unclassifiable from this comparison.
  function computeMapRatioClass(municipioIdx, ano) {
    const cellAll = getMapCell(municipioIdx, ano, 0);
    const cellForest = getMapCell(municipioIdx, ano, 1);
    if (!cellAll || !cellForest || !(cellAll.valor > 0)) return null;
    if (cellForest.produtoIdx === cellAll.produtoIdx) return "same";
    return cellForest.valor / cellAll.valor < 1 ? "nao" : "sim";
  }

  function initLeafletMap(municGeo, statesGeo, legalAmazonGeo) {
    leafletMap = L.map("map-container", { zoomControl: true }).setView([-7, -58], 5);

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
      maxZoom: 16
    }).addTo(leafletMap);

    leafletMap.createPane("paneMain");
    leafletMap.getPane("paneMain").style.zIndex = 400;
    leafletMap.createPane("paneBoundaries");
    leafletMap.getPane("paneBoundaries").style.zIndex = 450;

    L.geoJSON(statesGeo, { pane: "paneBoundaries", style: { color: "grey", weight: 1, fill: false }, interactive: false }).addTo(leafletMap);
    L.geoJSON(legalAmazonGeo, { pane: "paneBoundaries", style: { color: "black", weight: 2, fill: false }, interactive: false }).addTo(leafletMap);

    buildMapLayer(municGeo);

    mapLegendControl = L.control({ position: "bottomright" });
    mapLegendControl.onAdd = function () {
      this._div = L.DomUtil.create("div", "legend");
      return this._div;
    };
    mapLegendControl.addTo(leafletMap);
  }

  function mapStrokeColorFor(fillColor) {
    return fillColor === "url(#" + MAP_NODATA_PATTERN_ID + ")" ? MAP_NODATA_LINE : fillColor;
  }

  function buildMapLayer(municGeo) {
    mapLayersByCodIbge = new Map();
    let openTooltipLayer = null;

    L.geoJSON(municGeo, {
      pane: "paneMain",
      style: () => ({
        className: "muni-path",
        stroke: true,
        weight: 1,
        fillOpacity: 0.9,
        fillColor: "#cccccc",
        color: "#cccccc"
      }),
      onEachFeature: (feature, layer) => {
        mapLayersByCodIbge.set(String(feature.properties.cod_ibge), layer);
        layer.bindTooltip("", { sticky: true });

        layer.on("mouseover", () => {
          if (openTooltipLayer && openTooltipLayer !== layer) openTooltipLayer.closeTooltip();
          openTooltipLayer = layer;
          layer.setStyle({ weight: 5, color: "black", opacity: 1, fillOpacity: 1 });
          layer.bringToFront();
        });
        layer.on("mouseout", () => {
          if (openTooltipLayer === layer) openTooltipLayer = null;
          layer.setStyle({ weight: 1, opacity: 1, fillOpacity: 0.9, color: mapStrokeColorFor(layer.options.fillColor) });
        });
      }
    }).addTo(leafletMap);

    ensureNoDataPattern("map-container");
  }

  // Injects an SVG <pattern> for the "no data" fill into the map's own SVG
  // renderer, so polygons can set fillColor to `url(#nodata-hatch)`. Must
  // run after the first polygon layer exists (that's what makes Leaflet
  // create its SVG root).
  function ensureNoDataPattern(containerId) {
    const svg = document.querySelector("#" + containerId + " svg");
    if (!svg || svg.querySelector("#" + MAP_NODATA_PATTERN_ID)) return;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML =
      '<pattern id="' + MAP_NODATA_PATTERN_ID + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="6" height="6" fill="' + MAP_NODATA_BASE + '"></rect>' +
      '<line x1="0" y1="0" x2="0" y2="6" stroke="' + MAP_NODATA_LINE + '" stroke-width="2"></line>' +
      "</pattern>";
    svg.insertBefore(defs, svg.firstChild);
  }

  function mapCategoryColor(categoriaIdx) {
    if (categoriaIdx === -1) return OTHERS_COLOR;
    return CATEGORY_COLORS[categoriaIdx] || OTHERS_COLOR;
  }

  function mapCategoryLabel(categoriaIdx, t) {
    if (categoriaIdx === -1) return t.label_others;
    return mapData.categorias[categoriaIdx] || t.label_others;
  }

  function fmtPct(v) {
    return v.toLocaleString(state.lang === "en" ? "en-US" : "pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  }

  // Ratio mode's classification compares two *different* calculations —
  // top product by raw export value overall (cellAll) vs. top product by
  // raw export value among only the 16 forest-compatible codes
  // (cellForest) — then compares how distinctive (% of the Legal Amazon's
  // total for that specific product) each one is. Showing only the
  // classification label without both halves of that comparison is
  // exactly what made this mode hard to read: the tooltip is where the
  // "why" belongs, not just the "what".
  function mapTooltipHtml(t, municipio, cellAll, cellForest, ratioClass) {
    const rows = [
      `${t.tooltip_municipio} <b>${municipio.nome}</b>`,
      `${t.tooltip_estado} <b>${municipio.uf}</b>`
    ];
    if (state.mapMode === "ratio") {
      if (!ratioClass) {
        rows.push(`<i>${t.label_no_data}</i>`);
        return rows.join("<br>");
      }
      const label = ratioClass === "same" ? t.ratio_same : ratioClass === "sim" ? t.ratio_sim : t.ratio_nao;
      rows.push(`${t.tooltip_classe} <b>${label}</b>`);
      rows.push(`${t.tooltip_produto_geral} <b>${mapData.produtos[cellAll.produtoIdx]}</b> (${fmtPct(cellAll.valor)})`);
      rows.push(`${t.tooltip_produto_floresta} <b>${mapData.produtos[cellForest.produtoIdx]}</b> (${fmtPct(cellForest.valor)})`);
      rows.push(`<span style="font-size:0.85em;color:var(--muted);">${t.tooltip_valor_unidade}</span>`);
    } else if (cellAll) {
      rows.push(`${t.tooltip_produto} <b>${mapData.produtos[cellAll.produtoIdx]}</b>`);
      rows.push(`${t.tooltip_categoria} <b>${mapCategoryLabel(cellAll.categoriaIdx, t)}</b>`);
      rows.push(`${t.tooltip_valor} <b>${fmtPct(cellAll.valor)}</b>`);
      rows.push(`<span style="font-size:0.85em;color:var(--muted);">${t.tooltip_valor_unidade}</span>`);
    } else {
      rows.push(`<i>${t.label_no_data}</i>`);
    }
    return rows.join("<br>");
  }

  function renderMap() {
    const t = I18N[state.lang];
    const container = document.getElementById("map-container");

    if (!leafletMap) {
      let loadingDiv = document.getElementById("map-loading");
      if (!loadingDiv) {
        loadingDiv = document.createElement("div");
        loadingDiv.id = "map-loading";
        loadingDiv.className = "map-loading";
        container.parentElement.appendChild(loadingDiv);
      }
      loadingDiv.textContent = t.map_loading;
      ensureMapReady().then(() => {
        loadingDiv.remove();
        if (state.view === "map") updateMapColors();
      });
      return;
    }

    // The map's container was hidden (display:none) until this view was
    // selected, so Leaflet's internally-cached container size is stale —
    // without this it renders tiles into a zero-size viewport.
    leafletMap.invalidateSize();
    updateMapColors();
  }

  function updateMapColors() {
    if (!leafletMap) return;
    const t = I18N[state.lang];
    mapData.municipios.forEach((municipio, municipioIdx) => {
      const layer = mapLayersByCodIbge.get(municipio.cod_ibge);
      if (!layer) return;

      let fillColor, cellAll, cellForest, ratioClass;
      if (state.mapMode === "ratio") {
        ratioClass = computeMapRatioClass(municipioIdx, state.year);
        cellAll = getMapCell(municipioIdx, state.year, 0);
        cellForest = getMapCell(municipioIdx, state.year, 1);
        fillColor = ratioClass ? MAP_RATIO_COLORS[ratioClass] : "url(#" + MAP_NODATA_PATTERN_ID + ")";
      } else {
        cellAll = getMapCell(municipioIdx, state.year, state.mapMode === "forest" ? 1 : 0);
        fillColor = cellAll ? mapCategoryColor(cellAll.categoriaIdx) : "url(#" + MAP_NODATA_PATTERN_ID + ")";
      }

      layer.setStyle({ fillColor, color: mapStrokeColorFor(fillColor) });
      layer.setTooltipContent(mapTooltipHtml(t, municipio, cellAll, cellForest, ratioClass));
    });
    renderMapLegend(t);
  }

  // Legend is a fixed set (top-8 categories, or the 3 ratio classes) shown
  // in full every time — never trimmed to "only what's present this year"
  // — so the same color always means the same thing as you scrub the
  // year slider (color follows the entity, not its per-year presence).
  function renderMapLegend(t) {
    const div = mapLegendControl.getContainer();
    let html = "";
    if (state.mapMode === "ratio") {
      html += `<div class="legend-title">${t.legend_title_ratio}</div>`;
      html += `<div class="legend-row"><span class="swatch" style="background:${MAP_RATIO_COLORS.sim}"></span>${t.ratio_sim}</div>`;
      html += `<div class="legend-row"><span class="swatch" style="background:${MAP_RATIO_COLORS.nao}"></span>${t.ratio_nao}</div>`;
      html += `<div class="legend-row"><span class="swatch" style="background:${MAP_RATIO_COLORS.same}"></span>${t.ratio_same}</div>`;
    } else {
      html += `<div class="legend-title">${t.legend_title_category}</div>`;
      mapData.categorias.forEach((nome, i) => {
        html += `<div class="legend-row"><span class="swatch" style="background:${CATEGORY_COLORS[i]}"></span>${nome}</div>`;
      });
      html += `<div class="legend-row"><span class="swatch" style="background:${OTHERS_COLOR}"></span>${t.label_others}</div>`;
    }
    html += `<div class="legend-row"><span class="swatch swatch-nodata"></span>${t.label_no_data}</div>`;
    div.innerHTML = html;
  }

  // ---- State init from query string ----

  function initState() {
    const params = new URLSearchParams(location.search);
    const qLang = params.get("lang");
    const qYear = parseInt(params.get("year"), 10);
    const qTopN = parseInt(params.get("topn"), 10);
    const qView = params.get("view");
    const qState = params.get("state");
    const qYearA = parseInt(params.get("yeara"), 10);
    const qYearB = parseInt(params.get("yearb"), 10);
    const qMunis = params.get("munis");
    const qLog = params.get("log");
    const qIndex = params.get("index");
    const qCompScope = params.get("compscope");
    const qRankProduct = params.get("rankproduct");
    const qMapMode = params.get("mapmode");

    state.lang = qLang === "en" ? "en" : "pt";
    state.year = Number.isFinite(qYear) && qYear >= dictionary.year_inicio && qYear <= dictionary.year_final
      ? qYear
      : dictionary.year_final;
    state.topN = [10, 15, 20, 30].includes(qTopN) ? qTopN : 15;
    state.view = ["ranking", "composition", "change", "trends", "explore", "map"].includes(qView) ? qView : "ranking";
    state.changeState = ufList.includes(qState) ? qState : ufList[0];
    state.yearA = Number.isFinite(qYearA) && qYearA >= dictionary.year_inicio && qYearA <= dictionary.year_final
      ? qYearA
      : dictionary.year_inicio;
    state.yearB = Number.isFinite(qYearB) && qYearB >= dictionary.year_inicio && qYearB <= dictionary.year_final
      ? qYearB
      : dictionary.year_final;
    const decodedMunis = qMunis ? qMunis.split("|").filter((m) => totalsByMunicipio.has(m)) : [];
    state.exploreMunis = decodedMunis.length ? decodedMunis : computeTrendMunicipalities(5);
    state.exploreLog = qLog === "1";
    state.exploreIndex = qIndex === "1";
    state.compositionScope = qCompScope && muniCompositionRowsByMuni.has(qCompScope) ? qCompScope : null;
    // Validated once product_ranking.json is lazy-loaded (ensureProductRankingLoaded)
    // — the raw query value is kept provisionally so a shared URL still resolves.
    state.rankingProduct = qRankProduct || null;
    state.mapMode = ["forest", "all", "ratio"].includes(qMapMode) ? qMapMode : "forest";
  }

  function updateUrl() {
    const params = new URLSearchParams();
    params.set("lang", state.lang);
    params.set("year", state.year);
    params.set("topn", state.topN);
    params.set("view", state.view);
    params.set("state", state.changeState);
    params.set("yeara", state.yearA);
    params.set("yearb", state.yearB);
    params.set("munis", state.exploreMunis.join("|"));
    params.set("log", state.exploreLog ? "1" : "0");
    params.set("index", state.exploreIndex ? "1" : "0");
    params.set("compscope", state.compositionScope || "");
    params.set("rankproduct", state.rankingProduct || "");
    params.set("mapmode", state.mapMode);
    history.replaceState(null, "", `?${params.toString()}`);
  }

  // ---- Controls ----

  function initControls() {
    const slider = document.getElementById("year-slider");
    slider.min = dictionary.year_inicio;
    slider.max = dictionary.year_final;
    slider.addEventListener("input", () => {
      jumpToYear(parseInt(slider.value, 10));
    });

    document.getElementById("year-sparkline").addEventListener("click", (e) => {
      jumpToYear(yearFromPointerEvent(e));
    });

    document.getElementById("play-btn").addEventListener("click", togglePlay);

    document.getElementById("lang-toggle").addEventListener("click", () => {
      state.lang = state.lang === "pt" ? "en" : "pt";
      updateUrl();
      render();
    });

    document.getElementById("topn-select").value = String(state.topN);
    document.getElementById("topn-select").addEventListener("change", (e) => {
      state.topN = parseInt(e.target.value, 10);
      updateUrl();
      if (state.view === "trends") renderTrends();
      else renderRanking();
    });

    document.getElementById("view-ranking").addEventListener("click", () => setView("ranking"));
    document.getElementById("view-composition").addEventListener("click", () => setView("composition"));
    document.getElementById("view-change").addEventListener("click", () => setView("change"));
    document.getElementById("view-trends").addEventListener("click", () => setView("trends"));
    document.getElementById("view-explore").addEventListener("click", () => setView("explore"));
    document.getElementById("view-map").addEventListener("click", () => setView("map"));

    document.getElementById("map-mode-forest").addEventListener("click", () => setMapMode("forest"));
    document.getElementById("map-mode-all").addEventListener("click", () => setMapMode("all"));
    document.getElementById("map-mode-ratio").addEventListener("click", () => setMapMode("ratio"));

    // Curated dropdown renders immediately (hardcoded labels, see
    // PRODRANK_CURATED_LABELS) — no fetch until an actual product is picked.
    populateCuratedSelect();

    const rankingProductInput = document.getElementById("ranking-product-input");
    // Prefetch on focus so the full-catalog datalist is ready (or close to
    // it) by the time the user picks something from it, without paying the
    // cost just for landing on Ranking.
    rankingProductInput.addEventListener("focus", () => ensureProductRankingLoaded());
    rankingProductInput.addEventListener("change", (e) => {
      const code = rankingProductLabelToCode && rankingProductLabelToCode.get(e.target.value);
      if (!code) {
        syncRankingProductControls(); // typed text didn't match a real option — revert
        return;
      }
      state.rankingProduct = code;
      updateUrl();
      syncRankingProductControls();
      ensureProductRankingLoaded().then(() => render());
    });

    const rankingProductSelect = document.getElementById("ranking-product-select");
    rankingProductSelect.addEventListener("change", (e) => {
      if (e.target.value === "__custom__") return; // synthetic marker, not a real choice
      state.rankingProduct = e.target.value || null;
      updateUrl();
      syncRankingProductControls();
      if (state.rankingProduct) ensureProductRankingLoaded().then(() => render());
      else render();
    });

    const compositionScopeSelect = document.getElementById("composition-scope-select");
    const regionOpt = document.createElement("option");
    regionOpt.value = "";
    regionOpt.textContent = I18N[state.lang].composition_scope_region;
    compositionScopeSelect.appendChild(regionOpt);
    const compositionScopeMunis = computeTrendMunicipalities(municipioMeta.size).filter((m) => muniCompositionRowsByMuni.has(m));
    for (const municipio of compositionScopeMunis) {
      const opt = document.createElement("option");
      opt.value = municipio;
      opt.textContent = municipio;
      compositionScopeSelect.appendChild(opt);
    }
    compositionScopeSelect.value = state.compositionScope || "";
    compositionScopeSelect.addEventListener("change", (e) => {
      state.compositionScope = e.target.value || null;
      updateUrl();
      render(); // title is scope-dependent ("Composição — {municipio}"), not just the chart
    });

    const munisSelect = document.getElementById("explore-munis-select");
    const munisByTotal = computeTrendMunicipalities(municipioMeta.size);
    for (const municipio of munisByTotal) {
      const opt = document.createElement("option");
      opt.value = municipio;
      opt.textContent = municipio;
      opt.selected = state.exploreMunis.includes(municipio);
      munisSelect.appendChild(opt);
    }
    munisSelect.addEventListener("change", () => {
      state.exploreMunis = Array.from(munisSelect.selectedOptions).map((o) => o.value);
      updateUrl();
      renderExplore();
    });

    const logCheckbox = document.getElementById("explore-log");
    logCheckbox.checked = state.exploreLog;
    logCheckbox.addEventListener("change", (e) => {
      state.exploreLog = e.target.checked;
      updateUrl();
      renderExplore();
    });

    const indexCheckbox = document.getElementById("explore-index");
    indexCheckbox.checked = state.exploreIndex;
    indexCheckbox.addEventListener("change", (e) => {
      state.exploreIndex = e.target.checked;
      updateUrl();
      renderExplore();
    });

    const stateSelect = document.getElementById("change-state-select");
    for (const uf of ufList) {
      const opt = document.createElement("option");
      opt.value = uf;
      opt.textContent = uf;
      stateSelect.appendChild(opt);
    }
    stateSelect.value = state.changeState;
    stateSelect.addEventListener("change", (e) => {
      state.changeState = e.target.value;
      updateUrl();
      renderChange();
    });

    const yearASelect = document.getElementById("change-year-a");
    const yearBSelect = document.getElementById("change-year-b");
    for (let y = dictionary.year_inicio; y <= dictionary.year_final; y++) {
      const optA = document.createElement("option");
      optA.value = y; optA.textContent = y;
      yearASelect.appendChild(optA);
      const optB = document.createElement("option");
      optB.value = y; optB.textContent = y;
      yearBSelect.appendChild(optB);
    }
    yearASelect.value = state.yearA;
    yearBSelect.value = state.yearB;
    yearASelect.addEventListener("change", (e) => {
      state.yearA = parseInt(e.target.value, 10);
      updateUrl();
      renderChange();
    });
    yearBSelect.addEventListener("change", (e) => {
      state.yearB = parseInt(e.target.value, 10);
      updateUrl();
      renderChange();
    });
  }

  function setView(view) {
    stopPlaying();
    state.view = view;
    document.getElementById("view-ranking").classList.toggle("active", view === "ranking");
    document.getElementById("view-composition").classList.toggle("active", view === "composition");
    document.getElementById("view-change").classList.toggle("active", view === "change");
    document.getElementById("view-trends").classList.toggle("active", view === "trends");
    document.getElementById("view-explore").classList.toggle("active", view === "explore");
    document.getElementById("view-map").classList.toggle("active", view === "map");
    document.getElementById("ranking-panel").classList.toggle("hidden", view !== "ranking");
    document.getElementById("composition-panel").classList.toggle("hidden", view !== "composition");
    document.getElementById("change-panel").classList.toggle("hidden", view !== "change");
    document.getElementById("trends-panel").classList.toggle("hidden", view !== "trends");
    document.getElementById("explore-panel").classList.toggle("hidden", view !== "explore");
    document.getElementById("map-panel").classList.toggle("hidden", view !== "map");
    // topn-group is shared between ranking (per-year top-N, optionally
    // filtered to one product) and trends (all-time top-N).
    document.getElementById("topn-group").classList.toggle("hidden", view !== "ranking" && view !== "trends");
    document.getElementById("change-group").classList.toggle("hidden", view !== "change");
    document.getElementById("explore-group").classList.toggle("hidden", view !== "explore");
    document.getElementById("composition-scope-group").classList.toggle("hidden", view !== "composition");
    document.getElementById("ranking-product-group").classList.toggle("hidden", view !== "ranking");
    document.getElementById("map-group").classList.toggle("hidden", view !== "map");
    document.querySelector(".slider-inline").classList.toggle("hidden", view === "change");
    updateUrl();
    render();
  }

  function setMapMode(mode) {
    stopPlaying();
    state.mapMode = mode;
    document.getElementById("map-mode-forest").classList.toggle("active", mode === "forest");
    document.getElementById("map-mode-all").classList.toggle("active", mode === "all");
    document.getElementById("map-mode-ratio").classList.toggle("active", mode === "ratio");
    updateUrl();
    render();
  }

  function yearFromPointerEvent(e) {
    const rect = document.querySelector(".sparkline-wrap").getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const year = Math.round(dictionary.year_inicio + frac * (dictionary.year_final - dictionary.year_inicio));
    return Math.min(dictionary.year_final, Math.max(dictionary.year_inicio, year));
  }

  function initSparklineHover() {
    const wrap = document.querySelector(".sparkline-wrap");
    const hoverLine = document.getElementById("spark-hover-line");
    const hoverMarker = document.getElementById("spark-hover-marker");
    const tooltip = document.getElementById("spark-tooltip");

    wrap.addEventListener("pointermove", (e) => {
      if (!sparkXFor) return;
      const year = yearFromPointerEvent(e);
      const d = sparkSeries.find((s) => s.year === year);
      const svgX = sparkXFor(year);

      hoverLine.setAttribute("x1", svgX);
      hoverLine.setAttribute("x2", svgX);
      hoverLine.style.opacity = "1";

      const t = I18N[state.lang];

      if (d && d.value !== null) {
        hoverMarker.setAttribute("cx", svgX);
        hoverMarker.setAttribute("cy", sparkYFor(d.value));
        hoverMarker.style.opacity = "1";
        tooltip.innerHTML = "<strong>" + fmtAbbrev(d.value) + "</strong><br>" + year;
      } else {
        hoverMarker.style.opacity = "0";
        tooltip.innerHTML = "<strong>" + year + "</strong><br>" + t.label_no_data;
      }

      const rect = wrap.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      tooltip.style.left = Math.min(rect.width - 4, Math.max(4, frac * rect.width)) + "px";
      tooltip.style.opacity = "1";
    });

    wrap.addEventListener("pointerleave", () => {
      hoverLine.style.opacity = "0";
      hoverMarker.style.opacity = "0";
      tooltip.style.opacity = "0";
    });
  }

  function applyYear(newYear) {
    state.year = newYear;
    document.getElementById("year-slider").value = newYear;
    document.getElementById("year-value").textContent = newYear;
    updateUrl();
    if (state.view === "composition") {
      updateCompositionGuide();
    } else if (state.view === "trends") {
      updateTrendsMarkers();
    } else if (state.view === "explore") {
      updateExploreGuide();
    } else if (state.view === "map") {
      updateMapColors();
    } else {
      renderRanking();
    }
    updateSparklineMarker();
  }

  function jumpToYear(newYear) {
    stopPlaying();
    applyYear(newYear);
  }

  function togglePlay() {
    state.playing = !state.playing;
    const btn = document.getElementById("play-btn");
    btn.classList.toggle("playing", state.playing);
    btn.innerHTML = state.playing ? PAUSE_ICON_SVG : PLAY_ICON_SVG;

    if (state.playing) {
      if (state.year >= dictionary.year_final) {
        applyYear(dictionary.year_inicio);
      }
      state.playTimer = setInterval(() => {
        if (state.year >= dictionary.year_final) {
          stopPlaying();
          return;
        }
        applyYear(state.year + 1);
      }, PLAY_INTERVAL_MS);
    } else {
      clearInterval(state.playTimer);
    }
  }

  function stopPlaying() {
    if (!state.playing) return;
    state.playing = false;
    clearInterval(state.playTimer);
    const btn = document.getElementById("play-btn");
    btn.classList.remove("playing");
    btn.innerHTML = PLAY_ICON_SVG;
  }

  const PLAY_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
  const PAUSE_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';

  // ---- Rendering ----

  function render() {
    const t = I18N[state.lang];

    document.getElementById("plot_name").textContent = t.plot_name;
    document.getElementById("plot_desc").textContent = t.plot_desc;
    document.getElementById("label_year").textContent = t.label_year;
    document.getElementById("label_topn_name").textContent = t.label_topn_name;
    document.getElementById("label_view_name").textContent = t.label_view_name;
    document.getElementById("view-ranking").textContent = t.view_ranking;
    document.getElementById("view-composition").textContent = t.view_composition;
    document.getElementById("view-change").textContent = t.view_change;
    document.getElementById("view-trends").textContent = t.view_trends;
    document.getElementById("view-explore").textContent = t.view_explore;
    document.getElementById("view-map").textContent = t.view_map;
    document.getElementById("ranking-axis-label").textContent = t.ranking_axis_label;
    document.getElementById("change-axis-label").textContent = t.change_axis_label;
    document.getElementById("label_state").textContent = t.label_state;
    document.getElementById("label_year_a").textContent = t.label_year_a;
    document.getElementById("label_year_b").textContent = t.label_year_b;
    document.getElementById("label_explore_munis").textContent = t.label_explore_munis;
    document.getElementById("explore-hint").textContent = t.explore_hint;
    document.getElementById("label_log_scale").textContent = t.label_log_scale;
    document.getElementById("label_index_first").textContent = t.label_index_first;
    document.getElementById("label_composition_scope").textContent = t.label_composition_scope;
    document.getElementById("composition-scope-select").options[0].textContent = t.composition_scope_region;
    document.getElementById("label_ranking_product_select").textContent = t.label_ranking_product_select;
    document.getElementById("label_ranking_product_search").textContent = t.label_ranking_product_search;
    document.getElementById("label_map_mode").textContent = t.label_map_mode;
    document.getElementById("map-mode-forest").textContent = t.map_mode_forest;
    document.getElementById("map-mode-all").textContent = t.map_mode_all;
    document.getElementById("map-mode-ratio").textContent = t.map_mode_ratio;
    document.getElementById("map-hint").textContent = t.map_hint;
    document.getElementById("lang-toggle-label").textContent = t.btn_lang;
    // Repopulate the picker(s) too — option labels are language-specific.
    if (productRanking) populateRankingProductPicker(); else populateCuratedSelect();

    const titles = {
      ranking: state.rankingProduct ? t.title_ranking_product.replace("{produto}", rankingProductShortLabel(state.rankingProduct)) : t.title_ranking,
      composition: state.compositionScope ? t.title_composition_muni.replace("{municipio}", state.compositionScope) : t.title_composition,
      change: t.title_change, trends: t.title_trends, explore: t.title_explore,
      map: t[`title_map_${state.mapMode}`]
    };
    const subtitles = {
      ranking: t.subtitle_ranking,
      composition: state.compositionScope ? t.subtitle_composition_muni : t.subtitle_composition,
      change: t.subtitle_change, trends: t.subtitle_trends, explore: t.subtitle_explore,
      map: t[`subtitle_map_${state.mapMode}`]
    };
    document.getElementById("plot-title").textContent = titles[state.view];
    document.getElementById("plot-subtitle").textContent = subtitles[state.view];

    const slider = document.getElementById("year-slider");
    slider.value = state.year;
    document.getElementById("year-value").textContent = state.year;

    renderSparkline();
    if (state.view === "composition") {
      renderComposition();
    } else if (state.view === "change") {
      renderChange();
    } else if (state.view === "trends") {
      renderTrends();
    } else if (state.view === "explore") {
      renderExplore();
    } else if (state.view === "map") {
      renderMap();
    } else {
      renderRanking();
    }
  }

  const RANKING_IDS = { rows: "ranking-rows", tooltip: "ranking-tooltip", panel: "ranking-panel" };

  // Ranking is one chart (top-N municipalities for a year) fed by two
  // possible measures: total value across all products (rankingProduct
  // === null, using the always-loaded totalsByYear) or one specific
  // product's value (using the lazily-loaded productRankingRowsByCode).
  function renderRanking() {
    const t = I18N[state.lang];

    if (state.rankingProduct) {
      renderRankingByProduct(t);
      return;
    }

    const rows = totalsByYear.get(state.year) || [];
    const top = rows.slice(0, state.topN);
    const maxVal = top.length ? top[0].valor : 1;

    const regionTotal = regionTotalByYear.get(state.year);
    document.getElementById("region-total-label").innerHTML =
      regionTotal != null ? t.region_total_prefix + "<b>" + fmtAbbrev(regionTotal) + "</b>" : "";

    const container = document.getElementById(RANKING_IDS.rows);
    container.innerHTML = "";
    const frag = document.createDocumentFragment();
    top.forEach((row, i) => frag.appendChild(buildRankRow(row, i, maxVal, RANKING_IDS)));
    container.appendChild(frag);
  }

  // Ranking filtered to one specific product — same top-N bar list, rows
  // come from that product's municipality breakdown (lazily loaded)
  // instead of the always-available cross-product totals.
  function renderRankingByProduct(t) {
    const container = document.getElementById(RANKING_IDS.rows);

    if (!productRanking) {
      container.innerHTML = `<div class="prodrank-loading">${t.label_loading}</div>`;
      document.getElementById("region-total-label").textContent = "";
      ensureProductRankingLoaded().then(() => {
        if (state.view === "ranking" && state.rankingProduct) render();
      });
      return;
    }

    const allRows = productRankingRowsByCode.get(state.rankingProduct) || [];
    const rows = allRows
      .filter((r) => r.ano === state.year)
      .map((r) => ({ municipio: r.municipio, valor: r.valor }))
      .sort((a, b) => b.valor - a.valor);
    const top = rows.slice(0, state.topN);
    const maxVal = top.length ? top[0].valor : 1;

    const yearTotal = rows.reduce((sum, r) => sum + r.valor, 0);
    document.getElementById("region-total-label").innerHTML =
      rows.length ? t.ranking_product_total_prefix + "<b>" + fmtAbbrev(yearTotal) + "</b>" : "";

    container.innerHTML = "";
    const frag = document.createDocumentFragment();
    top.forEach((row, i) => frag.appendChild(buildRankRow(row, i, maxVal, RANKING_IDS)));
    container.appendChild(frag);
  }

  function buildRankRow(row, index, maxVal, ids) {
    const el = document.createElement("div");
    el.className = "rank-row";

    const pos = document.createElement("div");
    pos.className = "rank-position";
    pos.textContent = (index + 1) + ".";
    el.appendChild(pos);

    const label = document.createElement("div");
    label.className = "rank-label";
    label.textContent = row.municipio;
    label.title = row.municipio;
    el.appendChild(label);

    const track = document.createElement("div");
    track.className = "rank-track";
    const bar = document.createElement("div");
    bar.className = "rank-bar";
    bar.style.width = (maxVal > 0 ? (row.valor / maxVal) * 100 : 0) + "%";
    track.appendChild(bar);
    el.appendChild(track);

    const value = document.createElement("div");
    value.className = "rank-value";
    value.textContent = fmtAbbrev(row.valor);
    el.appendChild(value);

    el.addEventListener("pointerenter", (e) => showRankTooltip(e, row, index, ids));
    el.addEventListener("pointermove", (e) => moveRankTooltip(e, ids));
    el.addEventListener("pointerleave", () => hideRankTooltip(ids));

    return el;
  }

  function showRankTooltip(e, row, index, ids) {
    const tooltip = document.getElementById(ids.tooltip);
    tooltip.innerHTML =
      "<strong>" + row.municipio + "</strong><br>" +
      "#" + (index + 1) + " · US$ " + fmtNumber(row.valor);
    tooltip.style.opacity = "1";
    moveRankTooltip(e, ids);
  }

  function moveRankTooltip(e, ids) {
    const tooltip = document.getElementById(ids.tooltip);
    const panelRect = document.getElementById(ids.panel).getBoundingClientRect();
    tooltip.style.left = (e.clientX - panelRect.left + 12) + "px";
    tooltip.style.top = (e.clientY - panelRect.top + 12) + "px";
  }

  function hideRankTooltip(ids) {
    document.getElementById(ids.tooltip).style.opacity = "0";
  }

  // ---- Composition: stacked area of region-wide export value by product
  // category (SEC level, 22 categories) over the full time range. Reduced
  // to the top 8 by all-time total + an "Outros"/"Other" bucket, since 22
  // stacked bands would be unreadable and the dataviz convention here is a
  // 9th-plus series folds into Other rather than generating another hue. ----

  const COMP_PAD_L = 60, COMP_PAD_R = 16, COMP_PAD_T = 12, COMP_PAD_B = 28;
  const COMP_VB_W = 1000, COMP_VB_H = 520;

  function buildCompositionSeries(rows, dict) {
    const totalByProduct = new Map();
    for (const r of rows) {
      totalByProduct.set(r.produto, (totalByProduct.get(r.produto) || 0) + r.valor);
    }
    const ranked = Array.from(totalByProduct.entries()).sort((a, b) => b[1] - a[1]);
    const topProducts = ranked.slice(0, 8).map(([produto]) => produto);
    const topSet = new Set(topProducts);

    const years = [];
    for (let y = dict.year_inicio; y <= dict.year_final; y++) years.push(y);

    const byProdYear = new Map(); // produto -> Map(year -> valor)
    for (const p of topProducts) byProdYear.set(p, new Map());
    const othersByYear = new Map(years.map((y) => [y, 0]));

    for (const r of rows) {
      if (topSet.has(r.produto)) {
        byProdYear.get(r.produto).set(r.ano, r.valor);
      } else {
        othersByYear.set(r.ano, (othersByYear.get(r.ano) || 0) + r.valor);
      }
    }

    const series = topProducts.map((produto, i) => ({
      produto,
      color: CATEGORY_COLORS[i],
      isOthers: false,
      values: byProdYear.get(produto)
    }));
    series.push({ produto: null, color: OTHERS_COLOR, isOthers: true, values: othersByYear });

    return series;
  }

  function productLabel(produto) {
    if (produto === null) return I18N[state.lang].label_others;
    const list = products[state.lang] || products.pt;
    const hit = list.find((p) => p.var === produto);
    return hit ? hit.label : produto;
  }

  // Official SEC category names are long compound clauses joined by ";"
  // (e.g. "Madeira, carvão vegetal e obras de madeira; Cortiça e suas
  // obras..."). Cutting at the first clause boundary reads as a clean short
  // name instead of an arbitrary mid-word ellipsis.
  function productShortLabel(produto) {
    const full = productLabel(produto);
    const clause = full.split(";")[0].trim();
    return clause.length > 60 ? clause.slice(0, 57).trimEnd() + "…" : clause;
  }

  // One view, two scopes: region-wide (compositionScope === null, using the
  // precomputed compositionSeries) or a single municipality (recomputed from
  // muniCompositionRowsByMuni on each selection, since which categories rank
  // in someone's own top-8 depends on that place, not the region). Same
  // stacked-area chart either way, via renderStackedComposition/
  // updateStackedGuide/renderStackedLegend/initStackedHover.

  function renderComposition() {
    activeCompositionSeries = state.compositionScope
      ? buildCompositionSeries(muniCompositionRowsByMuni.get(state.compositionScope) || [], dictionary)
      : compositionSeries;
    renderStackedComposition(activeCompositionSeries, { svg: "composition-svg", guide: "comp-guide", legend: "composition-legend" });
  }

  function updateCompositionGuide() {
    updateStackedGuide("comp-guide");
  }

  function renderStackedComposition(series, ids) {
    const svg = document.getElementById(ids.svg);
    svg.innerHTML = "";

    const years = [];
    for (let y = dictionary.year_inicio; y <= dictionary.year_final; y++) years.push(y);

    // Stacked cumulative bounds per year, in the fixed series order.
    const cumByYear = new Map(years.map((y) => [y, 0]));
    const bandBounds = series.map((s) => {
      const bottoms = [], tops = [];
      for (const y of years) {
        const bottom = cumByYear.get(y);
        const top = bottom + (s.values.get(y) || 0);
        bottoms.push(bottom);
        tops.push(top);
        cumByYear.set(y, top);
      }
      return { bottoms, tops };
    });

    const maxTotal = Math.max(...years.map((y) => cumByYear.get(y)), 1);
    const xFor = (year) => COMP_PAD_L + ((year - dictionary.year_inicio) / (dictionary.year_final - dictionary.year_inicio)) * (COMP_VB_W - COMP_PAD_L - COMP_PAD_R);
    const yFor = (value) => COMP_PAD_T + (1 - value / maxTotal) * (COMP_VB_H - COMP_PAD_T - COMP_PAD_B);

    const svgNS = "http://www.w3.org/2000/svg";
    const addEl = (tag, attrs) => {
      const el = document.createElementNS(svgNS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      svg.appendChild(el);
      return el;
    };

    // Gridlines + Y labels (4 bands, recessive per the dataviz mark spec).
    for (let i = 0; i <= 4; i++) {
      const v = (maxTotal / 4) * i;
      const y = yFor(v);
      addEl("line", { class: "comp-gridline", x1: COMP_PAD_L, x2: COMP_VB_W - COMP_PAD_R, y1: y, y2: y });
      addEl("text", { class: "comp-axis-label", x: COMP_PAD_L - 8, y: y + 3, "text-anchor": "end" }).textContent = fmtAbbrev(v);
    }

    // X labels every 4 years.
    for (const y of years) {
      if ((y - dictionary.year_inicio) % 4 !== 0 && y !== dictionary.year_final) continue;
      addEl("text", { class: "comp-axis-label", x: xFor(y), y: COMP_VB_H - COMP_PAD_B + 16, "text-anchor": "middle" }).textContent = y;
    }

    // Stacked bands, in series order (largest all-time total at the
    // bottom, Outros last/top).
    series.forEach((s, i) => {
      const { bottoms, tops } = bandBounds[i];
      const topPts = years.map((y, j) => `${xFor(y).toFixed(1)},${yFor(tops[j]).toFixed(1)}`);
      const botPts = years.map((y, j) => `${xFor(y).toFixed(1)},${yFor(bottoms[j]).toFixed(1)}`).reverse();
      addEl("path", {
        class: "comp-band",
        fill: s.color,
        d: `M${topPts.join(" L")} L${botPts.join(" L")} Z`,
        "data-index": i
      });
    });

    // Selected-year guide line.
    const guideX = xFor(state.year);
    addEl("line", { id: ids.guide, class: "comp-guide", x1: guideX, x2: guideX, y1: COMP_PAD_T, y2: COMP_VB_H - COMP_PAD_B });

    renderStackedLegend(series, ids.legend);
  }

  function updateStackedGuide(guideId) {
    const guide = document.getElementById(guideId);
    if (!guide) return;
    const x = COMP_PAD_L + ((state.year - dictionary.year_inicio) / (dictionary.year_final - dictionary.year_inicio)) * (COMP_VB_W - COMP_PAD_L - COMP_PAD_R);
    guide.setAttribute("x1", x);
    guide.setAttribute("x2", x);
  }

  function renderStackedLegend(series, legendId) {
    const legend = document.getElementById(legendId);
    legend.innerHTML = "";
    for (const s of series) {
      const item = document.createElement("div");
      item.className = "legend-item";
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = s.color;
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = productShortLabel(s.produto);
      label.title = productLabel(s.produto);
      item.appendChild(swatch);
      item.appendChild(label);
      legend.appendChild(item);
    }
  }

  function initCompositionHover() {
    initStackedHover({ svg: "composition-svg", area: "composition-chart-area", tooltip: "composition-tooltip", view: "composition" }, () => activeCompositionSeries);
  }

  function initStackedHover(ids, getSeries) {
    const area = document.getElementById(ids.area);
    const tooltip = document.getElementById(ids.tooltip);

    area.addEventListener("pointermove", (e) => {
      if (state.view !== ids.view) return;
      const svg = document.getElementById(ids.svg);
      const rect = svg.getBoundingClientRect();
      const fracX = (e.clientX - rect.left) / rect.width;
      const vbX = fracX * COMP_VB_W;
      const frac = (vbX - COMP_PAD_L) / (COMP_VB_W - COMP_PAD_L - COMP_PAD_R);
      const year = Math.round(dictionary.year_inicio + frac * (dictionary.year_final - dictionary.year_inicio));
      if (year < dictionary.year_inicio || year > dictionary.year_final) {
        tooltip.style.opacity = "0";
        return;
      }

      const rowsHtml = getSeries()
        .map((s) => ({ label: productShortLabel(s.produto), full: productLabel(s.produto), color: s.color, valor: s.values.get(year) || 0 }))
        .sort((a, b) => b.valor - a.valor)
        .map((r) => `<div title="${r.full.replace(/"/g, "&quot;")}" style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:2px;background:${r.color};display:inline-block;flex:0 0 auto;"></span><span style="flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;">${r.label}</span><span style="flex:0 0 auto;padding-left:8px;">${fmtAbbrev(r.valor)}</span></div>`)
        .join("");

      tooltip.innerHTML = `<strong>${year}</strong>` + rowsHtml;
      const areaRect = area.getBoundingClientRect();
      const left = e.clientX - areaRect.left;
      tooltip.style.left = Math.min(areaRect.width - 300, left + 14) + "px";
      tooltip.style.top = (e.clientY - areaRect.top - 10) + "px";
      tooltip.style.opacity = "1";
    });

    area.addEventListener("pointerleave", () => {
      tooltip.style.opacity = "0";
    });

    area.addEventListener("click", (e) => {
      const svg = document.getElementById(ids.svg);
      const rect = svg.getBoundingClientRect();
      const fracX = (e.clientX - rect.left) / rect.width;
      const vbX = fracX * COMP_VB_W;
      const frac = (vbX - COMP_PAD_L) / (COMP_VB_W - COMP_PAD_L - COMP_PAD_R);
      const year = Math.round(dictionary.year_inicio + frac * (dictionary.year_final - dictionary.year_inicio));
      jumpToYear(Math.min(dictionary.year_final, Math.max(dictionary.year_inicio, year)));
    });
  }

  // ---- Change: ranked dumbbell chart, year A vs year B, filtered to one
  // state — same pattern as the CEMPRE map rebuild's compare mode (446
  // municipalities isn't readable as one ranked list; 13-115 per state is).
  // Dot color is a fixed identity pair (year A = blue, year B = orange),
  // not an encoding of which value is larger. ----

  function computeChangeRows(uf, yearA, yearB) {
    const rows = [];
    for (const [municipio, meta] of municipioMeta) {
      if (meta.uf !== uf) continue;
      const years = totalsByMunicipio.get(municipio);
      const valueA = years.get(yearA) || 0;
      const valueB = years.get(yearB) || 0;
      rows.push({ municipio, valueA, valueB, delta: valueB - valueA });
    }
    rows.sort((a, b) => b.delta - a.delta);
    return rows;
  }

  function changeDomain(rows) {
    if (!rows.length) return { min: 0, max: 1 };
    let min = Infinity, max = -Infinity;
    for (const r of rows) {
      min = Math.min(min, r.valueA, r.valueB);
      max = Math.max(max, r.valueA, r.valueB);
    }
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.05;
    return { min: min - pad, max: max + pad };
  }

  function pctForChange(value, domain) {
    return ((value - domain.min) / (domain.max - domain.min)) * 100;
  }

  function renderChange() {
    document.getElementById("change-legend-a-label").textContent = state.yearA;
    document.getElementById("change-legend-b-label").textContent = state.yearB;

    const rows = computeChangeRows(state.changeState, state.yearA, state.yearB);
    const domain = changeDomain(rows);
    document.getElementById("change-axis-min").textContent = fmtAbbrev(domain.min);
    document.getElementById("change-axis-max").textContent = fmtAbbrev(domain.max);

    const container = document.getElementById("change-rows");
    container.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const r of rows) frag.appendChild(buildChangeRowEl(r, domain));
    container.appendChild(frag);
  }

  function buildChangeRowEl(r, domain) {
    const pctA = pctForChange(r.valueA, domain);
    const pctB = pctForChange(r.valueB, domain);
    const lo = Math.min(pctA, pctB);
    const hi = Math.max(pctA, pctB);

    const row = document.createElement("div");
    row.className = "change-row";

    const label = document.createElement("div");
    label.className = "change-col-label";
    label.textContent = r.municipio;
    label.title = r.municipio;
    row.appendChild(label);

    const track = document.createElement("div");
    track.className = "change-col-track";
    const line = document.createElement("div");
    line.className = "change-line";
    line.style.left = lo + "%";
    line.style.width = (hi - lo) + "%";
    track.appendChild(line);
    const dotA = document.createElement("div");
    dotA.className = "change-dot change-dot-a";
    dotA.style.left = pctA + "%";
    track.appendChild(dotA);
    const dotB = document.createElement("div");
    dotB.className = "change-dot change-dot-b";
    dotB.style.left = pctB + "%";
    track.appendChild(dotB);
    row.appendChild(track);

    const delta = document.createElement("div");
    delta.className = "change-col-delta";
    delta.textContent = (r.delta > 0 ? "+" : "") + fmtAbbrev(r.delta);
    row.appendChild(delta);

    row.addEventListener("pointerenter", (e) => showChangeTooltip(e, r));
    row.addEventListener("pointermove", moveChangeTooltip);
    row.addEventListener("pointerleave", hideChangeTooltip);

    return row;
  }

  function showChangeTooltip(e, r) {
    const tooltip = document.getElementById("change-tooltip");
    const pct = r.valueA !== 0 ? (r.delta / Math.abs(r.valueA)) * 100 : null;
    tooltip.innerHTML =
      "<strong>" + r.municipio + "</strong><br>" +
      state.yearA + ": US$ " + fmtNumber(r.valueA) + "<br>" +
      state.yearB + ": US$ " + fmtNumber(r.valueB) + "<br>" +
      (r.delta >= 0 ? "+" : "") + fmtNumber(r.delta) +
      (pct !== null ? " (" + (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%)" : "");
    tooltip.style.opacity = "1";
    moveChangeTooltip(e);
  }

  function moveChangeTooltip(e) {
    const tooltip = document.getElementById("change-tooltip");
    const panelRect = document.getElementById("change-panel").getBoundingClientRect();
    tooltip.style.left = (e.clientX - panelRect.left + 12) + "px";
    tooltip.style.top = (e.clientY - panelRect.top + 12) + "px";
  }

  function hideChangeTooltip() {
    document.getElementById("change-tooltip").style.opacity = "0";
  }

  // ---- Trends: small multiples, one sparkline per top-N municipality by
  // all-time total value (independent of the ranking view's per-year
  // top-N, since a sparkline shows the whole range at once — there's no
  // single year to rank by). Shares the topn-select control with the
  // ranking view. ----

  const TREND_SPARK_W = 200, TREND_SPARK_H = 44, TREND_SPARK_PAD = 4;

  function computeTrendMunicipalities(topN) {
    const totals = Array.from(totalsByMunicipio.entries()).map(([municipio, years]) => {
      let sum = 0;
      for (const v of years.values()) sum += v;
      return { municipio, total: sum };
    });
    totals.sort((a, b) => b.total - a.total);
    return totals.slice(0, topN).map((d) => d.municipio);
  }

  function renderTrends() {
    const t = I18N[state.lang];
    const munis = computeTrendMunicipalities(state.topN);
    const grid = document.getElementById("trends-grid");
    grid.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const municipio of munis) frag.appendChild(buildTrendCard(municipio, t));
    grid.appendChild(frag);
  }

  function buildTrendCard(municipio, t) {
    const years = totalsByMunicipio.get(municipio);
    const series = [];
    for (let y = dictionary.year_inicio; y <= dictionary.year_final; y++) {
      series.push({ year: y, value: years.get(y) || 0 });
    }
    const values = series.map((d) => d.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const xFor = (year) => ((year - dictionary.year_inicio) / (dictionary.year_final - dictionary.year_inicio)) * TREND_SPARK_W;
    const yFor = (value) => (maxV === minV
      ? TREND_SPARK_H / 2
      : TREND_SPARK_PAD + (1 - (value - minV) / (maxV - minV)) * (TREND_SPARK_H - 2 * TREND_SPARK_PAD));

    const card = document.createElement("div");
    card.className = "trend-card";
    card.dataset.municipio = municipio;

    const header = document.createElement("div");
    header.className = "trend-card-header";
    const name = document.createElement("span");
    name.className = "trend-card-name";
    name.textContent = municipio;
    name.title = municipio;
    const latest = document.createElement("span");
    latest.className = "trend-card-value";
    latest.textContent = fmtAbbrev(values[values.length - 1]);
    header.appendChild(name);
    header.appendChild(latest);
    card.appendChild(header);

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "trend-sparkline");
    svg.setAttribute("viewBox", `0 0 ${TREND_SPARK_W} ${TREND_SPARK_H}`);
    svg.setAttribute("preserveAspectRatio", "none");

    const pts = series.map((d) => `${xFor(d.year).toFixed(1)},${yFor(d.value).toFixed(1)}`);
    const areaPath = document.createElementNS(svgNS, "path");
    areaPath.setAttribute("class", "trend-spark-area");
    areaPath.setAttribute("d", `M${xFor(series[0].year).toFixed(1)},${TREND_SPARK_H} L${pts.join(" L")} L${xFor(series[series.length - 1].year).toFixed(1)},${TREND_SPARK_H} Z`);
    svg.appendChild(areaPath);

    const linePath = document.createElementNS(svgNS, "path");
    linePath.setAttribute("class", "trend-spark-line");
    linePath.setAttribute("d", `M${pts.join(" L")}`);
    svg.appendChild(linePath);

    const marker = document.createElementNS(svgNS, "circle");
    marker.setAttribute("class", "trend-spark-marker");
    marker.setAttribute("r", "3");
    marker.dataset.role = "marker";
    svg.appendChild(marker);

    card.appendChild(svg);

    const footer = document.createElement("div");
    footer.className = "trend-card-footer";
    const first = values[0];
    // A near-zero 1997 base (common for municipalities that only started
    // exporting significant volumes later) makes the raw percentage
    // explode into six figures — technically correct, but not a useful
    // number to scan. Capped display; the sparkline shape already tells
    // the real story for these cases.
    const pctChange = first !== 0 ? ((values[values.length - 1] - first) / Math.abs(first)) * 100 : null;
    let pctLabel = "—";
    if (pctChange !== null) {
      // A decline is bounded at -100% (export value can't go below 0), so
      // anything past the cap can only be on the growth side.
      pctLabel = pctChange > 999
        ? ">999%"
        : (pctChange >= 0 ? "+" : "") + Math.round(pctChange) + "%";
    }
    footer.textContent = t.label_since_prefix + dictionary.year_inicio + ": " + pctLabel;
    card.appendChild(footer);

    positionTrendMarker(card, series, xFor, yFor);
    return card;
  }

  function positionTrendMarker(card, series, xFor, yFor) {
    const marker = card.querySelector('[data-role="marker"]');
    if (!marker) return;
    const d = series.find((s) => s.year === state.year);
    if (!d) { marker.setAttribute("opacity", "0"); return; }
    marker.setAttribute("cx", xFor(d.year));
    marker.setAttribute("cy", yFor(d.value));
    marker.setAttribute("opacity", "1");
  }

  // Repositions each card's selected-year marker without rebuilding the
  // grid — called on every autoplay tick, so it needs to be cheap.
  function updateTrendsMarkers() {
    const grid = document.getElementById("trends-grid");
    for (const card of grid.children) {
      const municipio = card.dataset.municipio;
      const years = totalsByMunicipio.get(municipio);
      if (!years) continue;
      const value = years.get(state.year);
      const marker = card.querySelector('[data-role="marker"]');
      if (!marker) continue;
      if (value === undefined) { marker.setAttribute("opacity", "0"); continue; }
      const series = [];
      for (let y = dictionary.year_inicio; y <= dictionary.year_final; y++) series.push(years.get(y) || 0);
      const minV = Math.min(...series);
      const maxV = Math.max(...series);
      const xFor = (year) => ((year - dictionary.year_inicio) / (dictionary.year_final - dictionary.year_inicio)) * TREND_SPARK_W;
      const yFor = (v) => (maxV === minV
        ? TREND_SPARK_H / 2
        : TREND_SPARK_PAD + (1 - (v - minV) / (maxV - minV)) * (TREND_SPARK_H - 2 * TREND_SPARK_PAD));
      marker.setAttribute("cx", xFor(state.year));
      marker.setAttribute("cy", yFor(value));
      marker.setAttribute("opacity", "1");
    }
  }

  // ---- Explore: hand-picked municipalities plotted directly as lines —
  // the "advanced" view, trimmed down from the original Shiny app's full
  // any-entity-vs-any-product flexibility. Scoped to municipality-vs-
  // municipality comparison only, since that's what the already-exported
  // data (municipality_totals.json) supports without a new, much larger
  // muni x product x year export; defaults to the top 5 by all-time total
  // rather than an empty picker, so there's always something on screen.

  const EXPLORE_PAD_L = 60, EXPLORE_PAD_R = 16, EXPLORE_PAD_T = 12, EXPLORE_PAD_B = 28;
  const EXPLORE_VB_W = 1000, EXPLORE_VB_H = 520;

  function buildExploreSeries() {
    const years = [];
    for (let y = dictionary.year_inicio; y <= dictionary.year_final; y++) years.push(y);

    return state.exploreMunis.map((municipio, i) => {
      const yearMap = totalsByMunicipio.get(municipio);
      const raw = years.map((y) => (yearMap ? yearMap.get(y) || 0 : 0));
      const first = raw[0];
      // Indexing to a zero base is undefined (not "no growth" — the flat
      // 0/0=0 fallback would misrepresent a municipality that grew from
      // nothing into a real exporter as having never changed at all).
      // Flagged so the line is skipped rather than drawn wrong.
      const undefinedIndex = state.exploreIndex && first === 0;
      const values = state.exploreIndex && !undefinedIndex
        ? raw.map((v) => (v / first) * 100)
        : raw;
      return { municipio, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length], years, values, undefinedIndex };
    });
  }

  function renderExplore() {
    const svg = document.getElementById("explore-svg");
    svg.innerHTML = "";
    const series = buildExploreSeries();

    if (!series.length) {
      renderExploreLegend(series);
      return;
    }

    const years = series[0].years;
    const logScale = state.exploreLog;
    const allValues = series.filter((s) => !s.undefinedIndex).flatMap((s) => s.values);
    const rawMax = Math.max(...allValues, 1);
    const rawMin = logScale ? Math.min(...allValues.filter((v) => v > 0), 1) : Math.min(0, ...allValues);

    const xFor = (year) => EXPLORE_PAD_L + ((year - dictionary.year_inicio) / (dictionary.year_final - dictionary.year_inicio)) * (EXPLORE_VB_W - EXPLORE_PAD_L - EXPLORE_PAD_R);
    const yFor = (value) => {
      const innerH = EXPLORE_VB_H - EXPLORE_PAD_T - EXPLORE_PAD_B;
      if (logScale) {
        const v = Math.max(value, rawMin);
        const frac = (Math.log(v) - Math.log(rawMin)) / (Math.log(rawMax) - Math.log(rawMin) || 1);
        return EXPLORE_PAD_T + (1 - frac) * innerH;
      }
      const frac = (value - rawMin) / (rawMax - rawMin || 1);
      return EXPLORE_PAD_T + (1 - frac) * innerH;
    };

    const svgNS = "http://www.w3.org/2000/svg";
    const addEl = (tag, attrs) => {
      const el = document.createElementNS(svgNS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      svg.appendChild(el);
      return el;
    };

    for (let i = 0; i <= 4; i++) {
      const v = logScale
        ? rawMin * Math.pow(rawMax / rawMin, i / 4)
        : rawMin + ((rawMax - rawMin) / 4) * i;
      const y = yFor(v);
      addEl("line", { class: "comp-gridline", x1: EXPLORE_PAD_L, x2: EXPLORE_VB_W - EXPLORE_PAD_R, y1: y, y2: y });
      addEl("text", { class: "comp-axis-label", x: EXPLORE_PAD_L - 8, y: y + 3, "text-anchor": "end" }).textContent =
        state.exploreIndex ? Math.round(v) : fmtAbbrev(v);
    }

    for (const y of years) {
      if ((y - dictionary.year_inicio) % 4 !== 0 && y !== dictionary.year_final) continue;
      addEl("text", { class: "comp-axis-label", x: xFor(y), y: EXPLORE_VB_H - EXPLORE_PAD_B + 16, "text-anchor": "middle" }).textContent = y;
    }

    for (const s of series) {
      if (s.undefinedIndex) continue;
      const pts = s.years.map((y, j) => `${xFor(y).toFixed(1)},${yFor(s.values[j]).toFixed(1)}`);
      addEl("path", { class: "explore-line", stroke: s.color, d: `M${pts.join(" L")}` });
    }

    const guideX = xFor(state.year);
    addEl("line", { id: "explore-guide", class: "explore-guide", x1: guideX, x2: guideX, y1: EXPLORE_PAD_T, y2: EXPLORE_VB_H - EXPLORE_PAD_B });

    renderExploreLegend(series);
  }

  function renderExploreLegend(series) {
    const t = I18N[state.lang];
    const legend = document.getElementById("explore-legend");
    legend.innerHTML = "";
    for (const s of series) {
      const item = document.createElement("div");
      item.className = "legend-item";
      if (s.undefinedIndex) item.classList.add("legend-item-muted");
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = s.undefinedIndex ? "transparent" : s.color;
      swatch.style.borderColor = s.color;
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = s.undefinedIndex
        ? `${s.municipio} (${t.explore_no_base.replace("{year}", dictionary.year_inicio)})`
        : s.municipio;
      label.title = label.textContent;
      item.appendChild(swatch);
      item.appendChild(label);
      legend.appendChild(item);
    }
  }

  function updateExploreGuide() {
    const guide = document.getElementById("explore-guide");
    if (!guide) return;
    const x = EXPLORE_PAD_L + ((state.year - dictionary.year_inicio) / (dictionary.year_final - dictionary.year_inicio)) * (EXPLORE_VB_W - EXPLORE_PAD_L - EXPLORE_PAD_R);
    guide.setAttribute("x1", x);
    guide.setAttribute("x2", x);
  }

  function initExploreHover() {
    const area = document.getElementById("explore-chart-area");
    const tooltip = document.getElementById("explore-tooltip");

    area.addEventListener("pointermove", (e) => {
      if (state.view !== "explore" || !state.exploreMunis.length) return;
      const svg = document.getElementById("explore-svg");
      const rect = svg.getBoundingClientRect();
      const fracX = (e.clientX - rect.left) / rect.width;
      const vbX = fracX * EXPLORE_VB_W;
      const frac = (vbX - EXPLORE_PAD_L) / (EXPLORE_VB_W - EXPLORE_PAD_L - EXPLORE_PAD_R);
      const year = Math.round(dictionary.year_inicio + frac * (dictionary.year_final - dictionary.year_inicio));
      if (year < dictionary.year_inicio || year > dictionary.year_final) {
        tooltip.style.opacity = "0";
        return;
      }

      const series = buildExploreSeries();
      const idx = year - dictionary.year_inicio;
      const rowsHtml = series
        .map((s) => ({ label: s.municipio, color: s.color, valor: s.values[idx] }))
        .sort((a, b) => b.valor - a.valor)
        .map((r) => `<div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:2px;background:${r.color};display:inline-block;flex:0 0 auto;"></span><span style="flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.label}</span><span style="flex:0 0 auto;padding-left:8px;">${state.exploreIndex ? r.valor.toFixed(0) : fmtAbbrev(r.valor)}</span></div>`)
        .join("");

      tooltip.innerHTML = `<strong>${year}</strong>` + rowsHtml;
      const areaRect = area.getBoundingClientRect();
      const left = e.clientX - areaRect.left;
      tooltip.style.left = Math.min(areaRect.width - 260, left + 14) + "px";
      tooltip.style.top = (e.clientY - areaRect.top - 10) + "px";
      tooltip.style.opacity = "1";
    });

    area.addEventListener("pointerleave", () => {
      tooltip.style.opacity = "0";
    });

    area.addEventListener("click", (e) => {
      const svg = document.getElementById("explore-svg");
      const rect = svg.getBoundingClientRect();
      const fracX = (e.clientX - rect.left) / rect.width;
      const vbX = fracX * EXPLORE_VB_W;
      const frac = (vbX - EXPLORE_PAD_L) / (EXPLORE_VB_W - EXPLORE_PAD_L - EXPLORE_PAD_R);
      const year = Math.round(dictionary.year_inicio + frac * (dictionary.year_final - dictionary.year_inicio));
      jumpToYear(Math.min(dictionary.year_final, Math.max(dictionary.year_inicio, year)));
    });
  }

  // ---- Sparkline: region-wide total export value per year ----

  function renderSparkline() {
    sparkSeries = regionTotals.map((r) => ({ year: r.ano, value: r.valor }));
    const values = sparkSeries.map((d) => d.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);

    sparkXFor = (year) => ((year - dictionary.year_inicio) / (dictionary.year_final - dictionary.year_inicio)) * SPARK_W;
    sparkYFor = (value) => (maxV === minV
      ? SPARK_H / 2
      : SPARK_PAD + (1 - (value - minV) / (maxV - minV)) * (SPARK_H - 2 * SPARK_PAD));

    const pts = sparkSeries.map((d) => `${sparkXFor(d.year).toFixed(1)},${sparkYFor(d.value).toFixed(1)}`);

    document.getElementById("spark-line").setAttribute("d", pts.length ? `M${pts.join(" L")}` : "");
    document.getElementById("spark-area").setAttribute("d", pts.length
      ? `M${sparkXFor(sparkSeries[0].year).toFixed(1)},${SPARK_H} L${pts.join(" L")} L${sparkXFor(sparkSeries[sparkSeries.length - 1].year).toFixed(1)},${SPARK_H} Z`
      : "");

    updateSparklineMarker();
  }

  function updateSparklineMarker() {
    if (!sparkXFor) return;
    const x = sparkXFor(state.year);
    const guide = document.getElementById("spark-guide");
    guide.setAttribute("x1", x);
    guide.setAttribute("x2", x);

    const d = sparkSeries.find((d) => d.year === state.year);
    const marker = document.getElementById("spark-marker");
    if (d && d.value !== null) {
      marker.setAttribute("cx", x);
      marker.setAttribute("cy", sparkYFor(d.value));
      marker.setAttribute("opacity", "1");
    } else {
      marker.setAttribute("opacity", "0");
    }
  }

  // ---- Formatting ----

  function fmtNumber(x) {
    if (x === null || x === undefined || Number.isNaN(x)) return "";
    return Number(x).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  }

  // Abbreviated US$ value for dense displays (ranking rows, sparkline
  // tooltip, region total) — full precision is one hover away in the row
  // tooltip. bi/mi/mil follow PT-BR convention; en labels reuse the same
  // magnitude words since this is a bilingual number, not translated text.
  function fmtAbbrev(x) {
    if (x === null || x === undefined || Number.isNaN(x)) return "";
    const abs = Math.abs(x);
    const fmt1 = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    if (abs >= 1e9) return "US$ " + fmt1(x / 1e9) + " bi";
    if (abs >= 1e6) return "US$ " + fmt1(x / 1e6) + " mi";
    if (abs >= 1e3) return "US$ " + fmt1(x / 1e3) + " mil";
    return "US$ " + fmtNumber(x);
  }
})();
