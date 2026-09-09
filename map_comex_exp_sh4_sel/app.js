// Data Zoom Amazônia — app_map_comex_exp_sh4_sel, JS/Leaflet rebuild
//
// Static rebuild of the Shiny app: data is pre-exported by
// data-raw/export_map_comex_exp_sh4_sel_web.R into
// web/map_comex_exp_sh4_sel/data/. Everything below runs client-side
// against those static files — no R server, no shinyapps.io.
//
// Shows, per municipality, the top exported product for a given year —
// colored by that product's HS2 category — under one of three modes:
// "forest" (top product among a curated 16-code forest-compatible list),
// "all" (top product among every product), or "ratio" (is this
// municipality's economy forest-compatible-dominant or not, derived
// client-side from the forest+all data already loaded, rather than a
// third exported dataset).
//
// Geometry/layer-building pattern (build once, recolor on change) is
// ported from the sibling app_map_dz_munic_cempre rebuild.

(function () {
  "use strict";

  const I18N = {
    pt: {
      plot_name: "Data Zoom Amazônia",
      plot_desc: "Comércio exterior na Amazônia (COMEX): principal produto exportado por município",
      label_mode_name: "VARIÁVEIS:",
      mode_forest: "Compatíveis c/ Floresta",
      mode_all: "Todos os Produtos",
      mode_ratio: "Razão Floresta/Outros",
      label_year: "Ano",
      title_forest: "Principal produto compatível com a floresta",
      title_all: "Principal produto exportado",
      title_ratio: "Floresta vs. outros produtos",
      subtitle_forest: "Município colorido pela categoria do seu principal produto compatível com a floresta, por ano",
      subtitle_all: "Município colorido pela categoria do seu principal produto exportado, por ano",
      subtitle_ratio: "O principal produto exportado do município é compatível com a floresta?",
      map_hint: "Passe o mouse sobre um município para ver detalhes.",
      tooltip_municipio: "Município:",
      tooltip_estado: "Estado:",
      tooltip_produto: "Principal produto:",
      tooltip_categoria: "Categoria:",
      tooltip_valor: "Valor:",
      tooltip_valor_unidade: "% das exportações desse produto na Amazônia Legal vindas deste município",
      tooltip_classe: "Classificação:",
      label_others: "Outros",
      label_no_data: "Sem dado",
      ratio_same: "Mesmo produto principal",
      ratio_nao: "Principal produto não é compatível com a floresta",
      ratio_sim: "Principal produto é compatível com a floresta",
      legend_title_category: "Categoria do principal produto",
      legend_title_ratio: "Classificação",
      btn_lang: "English"
    },
    en: {
      plot_name: "Data Zoom Amazônia",
      plot_desc: "Foreign trade in the Amazon (COMEX): main exported product by municipality",
      label_mode_name: "VARIABLES:",
      mode_forest: "Forest Compatible",
      mode_all: "All Products",
      mode_ratio: "Forest/Other Ratio",
      label_year: "Year",
      title_forest: "Main forest-compatible product",
      title_all: "Main exported product",
      title_ratio: "Forest vs. other products",
      subtitle_forest: "Municipality colored by its main forest-compatible product's category, by year",
      subtitle_all: "Municipality colored by its main exported product's category, by year",
      subtitle_ratio: "Is the municipality's main exported product forest-compatible?",
      map_hint: "Hover over a municipality to see details.",
      tooltip_municipio: "Municipality:",
      tooltip_estado: "State:",
      tooltip_produto: "Main product:",
      tooltip_categoria: "Category:",
      tooltip_valor: "Value:",
      tooltip_valor_unidade: "% of that product's Legal Amazon exports that came from this municipality",
      tooltip_classe: "Classification:",
      label_others: "Other",
      label_no_data: "No data",
      ratio_same: "Same main product",
      ratio_nao: "Main product is not forest-compatible",
      ratio_sim: "Main product is forest-compatible",
      legend_title_category: "Main product's category",
      legend_title_ratio: "Classification",
      btn_lang: "Português"
    }
  };

  // Same fixed 8-hue order as the rest of this app family (Okabe-Ito).
  const CATEGORY_COLORS = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7", "#666666"];
  const OTHERS_COLOR = "#c9c4ba";

  // Ratio mode's 3 classes are a fixed identity set, not a magnitude scale.
  const RATIO_COLORS = { same: "#666666", nao: "#D55E00", sim: "#009E73" };

  const NODATA_PATTERN_ID = "nodata-hatch";
  const NODATA_BASE = "#deeaef";
  const NODATA_LINE = "#a2adb1";

  const DATA_DIR = "data";
  const PLAY_INTERVAL_MS = 900;

  const state = {
    lang: "pt",
    mode: "forest", // "forest" | "all" | "ratio"
    year: null,
    playing: false,
    playTimer: null
  };

  let dictionary, mapData;
  let cellByKey; // "municipioIdx|ano|floresta" -> {categoria_idx, produto_idx, valor}
  let municipalities; // {cod_ibge, nome, uf}[] in the same order as the geojson features
  let map, legendControl;
  let layersByCodIbge = new Map();

  Promise.all([
    fetchJson(`${DATA_DIR}/dictionary.json`),
    fetchJson(`${DATA_DIR}/map_data.json`),
    fetchJson(`${DATA_DIR}/municipalities.geojson`),
    fetchJson(`${DATA_DIR}/states_boundary.geojson`),
    fetchJson(`${DATA_DIR}/legal_amazon_boundary.geojson`)
  ]).then(([dict, data, municGeo, statesGeo, legalAmazonGeo]) => {
    dictionary = dict;
    mapData = data;
    municipalities = data.municipios;

    cellByKey = new Map();
    for (const [municipioIdx, ano, floresta, categoriaIdx, produtoIdx, valor] of data.cells) {
      cellByKey.set(`${municipioIdx}|${ano}|${floresta}`, { categoriaIdx, produtoIdx, valor });
    }

    initState();
    initControls();
    initMap(municGeo, statesGeo, legalAmazonGeo);
    render();
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

  function getCell(municipioIdx, ano, floresta) {
    return cellByKey.get(`${municipioIdx}|${ano}|${floresta}`);
  }

  // Ratio mode is derived client-side from the forest (floresta=1) and
  // all-products (floresta=0) cells already loaded, mirroring the original
  // app's classe_ratio logic exactly: if either side has no top product
  // that year, there's not enough information to classify (no data) — a
  // municipality with zero forest-compatible exports isn't "not
  // forest-dominant", it's simply unclassifiable from this comparison.
  function computeRatioClass(municipioIdx, ano) {
    const cellAll = getCell(municipioIdx, ano, 0);
    const cellForest = getCell(municipioIdx, ano, 1);
    if (!cellAll || !cellForest || !(cellAll.valor > 0)) return null;
    if (cellForest.produtoIdx === cellAll.produtoIdx) return "same";
    return cellForest.valor / cellAll.valor < 1 ? "nao" : "sim";
  }

  // ---- State init from query string ----

  function initState() {
    const params = new URLSearchParams(location.search);
    const qLang = params.get("lang");
    const qMode = params.get("mode");
    const qYear = parseInt(params.get("year"), 10);

    state.lang = qLang === "en" ? "en" : "pt";
    state.mode = ["forest", "all", "ratio"].includes(qMode) ? qMode : "forest";
    state.year = Number.isFinite(qYear) && qYear >= dictionary.year_inicio && qYear <= dictionary.year_final
      ? qYear
      : dictionary.year_final;
  }

  function updateUrl() {
    const params = new URLSearchParams();
    params.set("lang", state.lang);
    params.set("mode", state.mode);
    params.set("year", state.year);
    history.replaceState(null, "", `?${params.toString()}`);
  }

  // ---- Controls ----

  function initControls() {
    document.getElementById("mode-forest").addEventListener("click", () => setMode("forest"));
    document.getElementById("mode-all").addEventListener("click", () => setMode("all"));
    document.getElementById("mode-ratio").addEventListener("click", () => setMode("ratio"));

    const slider = document.getElementById("year-slider");
    slider.min = dictionary.year_inicio;
    slider.max = dictionary.year_final;
    slider.addEventListener("input", () => {
      jumpToYear(parseInt(slider.value, 10));
    });

    document.getElementById("play-btn").addEventListener("click", togglePlay);

    document.getElementById("lang-toggle").addEventListener("click", () => {
      state.lang = state.lang === "pt" ? "en" : "pt";
      updateUrl();
      render();
    });
  }

  function setMode(mode) {
    stopPlaying();
    state.mode = mode;
    document.getElementById("mode-forest").classList.toggle("active", mode === "forest");
    document.getElementById("mode-all").classList.toggle("active", mode === "all");
    document.getElementById("mode-ratio").classList.toggle("active", mode === "ratio");
    updateUrl();
    render();
  }

  function applyYear(newYear) {
    state.year = newYear;
    document.getElementById("year-slider").value = newYear;
    document.getElementById("year-value").textContent = newYear;
    updateUrl();
    updateMapColors();
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
      if (state.year >= dictionary.year_final) applyYear(dictionary.year_inicio);
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

  // ---- Map ----

  function initMap(municGeo, statesGeo, legalAmazonGeo) {
    map = L.map("map", { zoomControl: true }).setView([-7, -58], 5);

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
      maxZoom: 16
    }).addTo(map);

    map.createPane("paneMain");
    map.getPane("paneMain").style.zIndex = 400;
    map.createPane("paneBoundaries");
    map.getPane("paneBoundaries").style.zIndex = 450;

    L.geoJSON(statesGeo, { pane: "paneBoundaries", style: { color: "grey", weight: 1, fill: false }, interactive: false }).addTo(map);
    L.geoJSON(legalAmazonGeo, { pane: "paneBoundaries", style: { color: "black", weight: 2, fill: false }, interactive: false }).addTo(map);

    buildMapLayer(municGeo);

    legendControl = L.control({ position: "bottomright" });
    legendControl.onAdd = function () {
      this._div = L.DomUtil.create("div", "legend");
      return this._div;
    };
    legendControl.addTo(map);
  }

  function strokeColorFor(fillColor) {
    return fillColor === "url(#" + NODATA_PATTERN_ID + ")" ? NODATA_LINE : fillColor;
  }

  function buildMapLayer(municGeo) {
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
        layersByCodIbge.set(String(feature.properties.cod_ibge), layer);
        layer.bindTooltip("", { sticky: true });

        layer.on("mouseover", () => {
          if (openTooltipLayer && openTooltipLayer !== layer) openTooltipLayer.closeTooltip();
          openTooltipLayer = layer;
          layer.setStyle({ weight: 5, color: "black", opacity: 1, fillOpacity: 1 });
          layer.bringToFront();
        });
        layer.on("mouseout", () => {
          if (openTooltipLayer === layer) openTooltipLayer = null;
          layer.setStyle({ weight: 1, opacity: 1, fillOpacity: 0.9, color: strokeColorFor(layer.options.fillColor) });
        });
      }
    }).addTo(map);

    ensureNoDataPattern("map");
  }

  // Injects an SVG <pattern> for the "no data" fill into the map's own SVG
  // renderer, so polygons can set fillColor to `url(#nodata-hatch)`. Must
  // run after the first polygon layer exists (that's what makes Leaflet
  // create its SVG root).
  function ensureNoDataPattern(containerId) {
    const svg = document.querySelector("#" + containerId + " svg");
    if (!svg || svg.querySelector("#" + NODATA_PATTERN_ID)) return;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML =
      '<pattern id="' + NODATA_PATTERN_ID + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="6" height="6" fill="' + NODATA_BASE + '"></rect>' +
      '<line x1="0" y1="0" x2="0" y2="6" stroke="' + NODATA_LINE + '" stroke-width="2"></line>' +
      "</pattern>";
    svg.insertBefore(defs, svg.firstChild);
  }

  function categoryColor(categoriaIdx) {
    if (categoriaIdx === -1) return OTHERS_COLOR;
    return CATEGORY_COLORS[categoriaIdx] || OTHERS_COLOR;
  }

  function categoryLabel(categoriaIdx, t) {
    if (categoriaIdx === -1) return t.label_others;
    return mapData.categorias[categoriaIdx] || t.label_others;
  }

  function fmtPct(v) {
    return v.toLocaleString(state.lang === "en" ? "en-US" : "pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  }

  function tooltipHtml(t, municipio, cell, ratioClass) {
    const rows = [
      `${t.tooltip_municipio} <b>${municipio.nome}</b>`,
      `${t.tooltip_estado} <b>${municipio.uf}</b>`
    ];
    if (state.mode === "ratio") {
      const label = ratioClass === "same" ? t.ratio_same : ratioClass === "sim" ? t.ratio_sim : t.ratio_nao;
      rows.push(`${t.tooltip_classe} <b>${label}</b>`);
      if (cell) rows.push(`${t.tooltip_produto} <b>${mapData.produtos[cell.produtoIdx]}</b>`);
    } else if (cell) {
      rows.push(`${t.tooltip_produto} <b>${mapData.produtos[cell.produtoIdx]}</b>`);
      rows.push(`${t.tooltip_categoria} <b>${categoryLabel(cell.categoriaIdx, t)}</b>`);
      rows.push(`${t.tooltip_valor} <b>${fmtPct(cell.valor)}</b>`);
      rows.push(`<span style="font-size:0.85em;color:#6b6156;">${t.tooltip_valor_unidade}</span>`);
    }
    return rows.join("<br>");
  }

  function updateMapColors() {
    const t = I18N[state.lang];
    municipalities.forEach((municipio, municipioIdx) => {
      const layer = layersByCodIbge.get(municipio.cod_ibge);
      if (!layer) return;

      let fillColor, cell, ratioClass;
      if (state.mode === "ratio") {
        ratioClass = computeRatioClass(municipioIdx, state.year);
        cell = getCell(municipioIdx, state.year, 0);
        fillColor = ratioClass ? RATIO_COLORS[ratioClass] : "url(#" + NODATA_PATTERN_ID + ")";
      } else {
        cell = getCell(municipioIdx, state.year, state.mode === "forest" ? 1 : 0);
        fillColor = cell ? categoryColor(cell.categoriaIdx) : "url(#" + NODATA_PATTERN_ID + ")";
      }

      layer.setStyle({ fillColor, color: strokeColorFor(fillColor) });
      layer.setTooltipContent(tooltipHtml(t, municipio, cell, ratioClass));
    });
    renderLegend(t);
  }

  // Legend is a fixed set (top-8 categories, or the 3 ratio classes) shown
  // in full every time — never trimmed to "only what's present this year"
  // — so the same color always means the same thing as you scrub the
  // year slider (color follows the entity, not its per-year presence).
  function renderLegend(t) {
    const div = legendControl.getContainer();
    let html = "";
    if (state.mode === "ratio") {
      html += `<div class="legend-title">${t.legend_title_ratio}</div>`;
      html += `<div class="legend-row"><span class="swatch" style="background:${RATIO_COLORS.sim}"></span>${t.ratio_sim}</div>`;
      html += `<div class="legend-row"><span class="swatch" style="background:${RATIO_COLORS.nao}"></span>${t.ratio_nao}</div>`;
      html += `<div class="legend-row"><span class="swatch" style="background:${RATIO_COLORS.same}"></span>${t.ratio_same}</div>`;
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

  // ---- Rendering ----

  function render() {
    const t = I18N[state.lang];

    document.getElementById("plot_name").textContent = t.plot_name;
    document.getElementById("plot_desc").textContent = t.plot_desc;
    document.getElementById("label_mode_name").textContent = t.label_mode_name;
    document.getElementById("mode-forest").textContent = t.mode_forest;
    document.getElementById("mode-all").textContent = t.mode_all;
    document.getElementById("mode-ratio").textContent = t.mode_ratio;
    document.getElementById("label_year").textContent = t.label_year;
    document.getElementById("map-hint").textContent = t.map_hint;
    document.getElementById("lang-toggle-label").textContent = t.btn_lang;

    const titles = { forest: t.title_forest, all: t.title_all, ratio: t.title_ratio };
    const subtitles = { forest: t.subtitle_forest, all: t.subtitle_all, ratio: t.subtitle_ratio };
    document.getElementById("plot-title").textContent = titles[state.mode];
    document.getElementById("plot-subtitle").textContent = subtitles[state.mode];

    const slider = document.getElementById("year-slider");
    slider.value = state.year;
    document.getElementById("year-value").textContent = state.year;

    updateMapColors();
  }
})();
