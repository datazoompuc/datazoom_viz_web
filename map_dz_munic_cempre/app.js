// Data Zoom Amazônia — app_map_dz_munic_cempre, JS/Leaflet PoC
//
// Static rebuild of the Shiny app: data is pre-exported by
// data-raw/export_map_dz_munic_cempre_web.R (which reuses the same join
// logic as scripts/map_dz_munic_cempre/server.R) into web/map_dz_munic_cempre/data/.
// Everything below runs client-side against those static files — no R
// server, no shinyapps.io.

(function () {
  "use strict";

  // ---- i18n strings (mirrors param$i18n in apps/app_map_dz_munic_cempre.R) ----

  const I18N = {
    pt: {
      plot_name: "Data Zoom Amazônia",
      plot_desc: "Compilação de dados ao nível municipal (CEMPRE)",
      label_var_name: "VARIÁVEIS:",
      label_x_name: "Seleciona variável (x)",
      label_year: "Ano referente",
      label_title: "Mapa dos municípios da Amazônia Legal",
      label_munic_name: "Nome do Município <b>",
      label_state_name: "Estado: <b>",
      label_measurement_unit: "Unidade de medida: <b>",
      label_no_data: "Sem dado",
      label_compare_state: "Estado",
      btn_compare: "Comparar anos",
      btn_compare_exit: "Sair da comparação",
      btn_snapshot: "Salvar imagem",
      btn_snapshot_busy: "Gerando imagem…",
      snapshot_error: "Não foi possível gerar a imagem. Veja o console para detalhes.",
      label_load_error: "Não foi possível carregar os dados.",
      label_retry: "Tentar novamente",
      dumbbell_note: (n) => `${n} município(s) sem dado em um dos dois anos selecionados`,
      btn_lang: "English"
    },
    en: {
      plot_name: "Data Zoom Amazônia",
      plot_desc: "Data compilation at municipality level (CEMPRE)",
      label_var_name: "VARIABLES:",
      label_x_name: "Select variable (x)",
      label_year: "Reference year",
      label_title: "Legal Amazon municipality map",
      label_munic_name: "Municipality name: <b>",
      label_state_name: "State: <b>",
      label_measurement_unit: "Measurement unit: <b>",
      label_no_data: "No data",
      label_compare_state: "State",
      btn_compare: "Compare years",
      btn_compare_exit: "Exit comparison",
      btn_snapshot: "Save image",
      btn_snapshot_busy: "Generating image…",
      snapshot_error: "Couldn't generate the image — see console for details.",
      label_load_error: "Could not load the data.",
      label_retry: "Try again",
      dumbbell_note: (n) => `${n} municipalit${n === 1 ? "y" : "ies"} missing data in one of the selected years`,
      btn_lang: "Português"
    }
  };

  // UF -> display name, same in pt/en (Brazilian state names aren't
  // translated). Used to label the compare-mode state filter.
  const STATE_NAMES = {
    AC: "Acre", AM: "Amazonas", AP: "Amapá", MA: "Maranhão",
    MT: "Mato Grosso", PA: "Pará", RO: "Rondônia", RR: "Roraima", TO: "Tocantins"
  };

  // Single-hue sequential ramp — plum/berry, ~340deg OKLCH hue, light ->
  // dark = low -> high. Deliberately NOT the app's own greens (H~168-183):
  // the sidebar and the choropleth used to share a hue family, so the data
  // layer visually merged into the brand chrome. This hue sits far enough
  // around the wheel from the sidebar's cool green to read as clearly
  // separate — the boldest, most saturated of the three hues considered
  // (amber and blue were the other two candidates). Validated with the
  // skill's own checker as an ordinal ramp (these 9 stops render as
  // discrete legend swatches, not a continuous gradient, so --ordinal is
  // the applicable check): monotone lightness, adjacent ΔL >= 0.06, single
  // hue, and light-end contrast 2.02:1 against a white legend surface (>=
  // the 2:1 floor) — see data-raw/build_sequential_ramp.mjs for the
  // generator.
  const PALETTE_CONTINUOUS = [
    "#c4b1bd", "#c691b3", "#c66dab", "#b8539b", "#a63c89",
    "#912976", "#791a62", "#610f4d", "#490839"
  ];

  // "No data" gets a hatch texture, not a flat gray: an under-vs-missing
  // mixup on a choropleth is a real misread, not just an aesthetic gap.
  // NODATA_BASE/LINE use a cool, low-chroma blue-gray — distinct from both
  // the sidebar's green and the ramp's plum, so it can't be mistaken for
  // either. Base clears the normal-vision floor (dE 15.4, OKLab, the
  // dataviz skill's CVD-separation metric) against the lightest bin; the
  // diagonal hatch is the accessibility skill's texture channel — a
  // second, hue-independent signal.
  const NODATA_PATTERN_ID = "nodata-hatch";
  const NODATA_BASE = "#deeaef";
  const NODATA_LINE = "#a2adb1";

  // Canvas text colors for exported snapshots — matches style.css's
  // --ink/--muted tokens (the warm neutral that replaced generic #222/#555).
  const CANVAS_INK = "#221d17";
  const CANVAS_MUTED = "#6b6156";

  // The seam-hiding stroke (see buildMapLayer) needs a plain color, not the
  // no-data hatch's pattern url() — reuse its line color there instead.
  function strokeColorFor(fillColor) {
    return fillColor === "url(#" + NODATA_PATTERN_ID + ")" ? NODATA_LINE : fillColor;
  }

  const DATA_DIR = "data";
  const LOGO_URL = "img/logo_datazoom_branco_horizontal.png"; // watermark on exported snapshots — see getTintedLogo()
  const N_BINS = 9;
  const SPARK_W = 260;
  const SPARK_H = 40;
  const SPARK_PAD = 4;
  const PLAY_INTERVAL_MS = 1200; // autoplay tick — kept comfortably above the .muni-path fill transition (style.css) so each year settles before the next
  const SNAPSHOT_TITLE_BAND_H = 52; // dedicated header strip on exported images — see captureSnapshot
  const COMPARE_LEGEND_BAND_H = 34; // year A/B color-chip strip under the title, compare-mode snapshots only

  // Dumbbell chart row geometry — must match the column widths in style.css
  // (.dumbbell-col-label/.dumbbell-col-track/.dumbbell-col-delta) since the
  // snapshot export redraws the same layout procedurally on a canvas
  // instead of rasterizing the live DOM.
  const DUMBBELL_ROW_H = 22;
  const DUMBBELL_LABEL_W = 170;
  const DUMBBELL_DELTA_W = 84;
  const DUMBBELL_PAD_L = 14;
  const DUMBBELL_PAD_R = 14;

  // Play/pause icon swap for #play-btn (Feather Icons, MIT license —
  // https://github.com/feathericons/feather — "play"/"pause", inlined
  // rather than pulled from a CDN so the app stays offline-capable with
  // one less network request). stroke="currentColor" in the markup already
  // set in index.html means these just need swapping wholesale, no
  // separate color handling.
  const PLAY_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
  const PAUSE_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';

  const state = {
    lang: "pt",
    x: null,
    year: null,
    playing: false,
    playTimer: null,
    compareMode: false,
    yearA: null,
    yearB: null,
    compareState: null // UF filter for the compare-mode dumbbell chart
  };

  let map, legendControl;
  let municGeo, statesGeo, legalAmazonGeo, attributesByYear, dictionary, fullDomainByVar;
  let statesList = []; // sorted unique UF codes present in the data, for the compare-mode state filter
  let municMetaByCodIbge; // cod_ibge -> { estado, nome }, for the dumbbell chart's per-municipality lookups

  // Built once in buildMapLayer(); year/variable/lang changes update these
  // layers in place (setStyle / setTooltipContent) instead of tearing down
  // and recreating the whole GeoJSON layer. That's what lets the CSS
  // transition on .muni-path actually animate — a fresh element every frame
  // has no "previous" fill to transition from.
  const layersByCodIbge = new Map();
  const breaksCache = {}; // var -> { breaks, colors }, since the domain (and so the bins) only depends on the variable, not the year
  let sparkSeries = [];
  let sparkXFor = null;
  let sparkYFor = null;
  let dumbbellRender = null; // last dumbbell dataset computed by updateDumbbellChart() — reused by the snapshot export

  // ---- Boot ----

  Promise.all([
    fetchJson(`${DATA_DIR}/municipalities.geojson`),
    fetchJson(`${DATA_DIR}/states_boundary.geojson`),
    fetchJson(`${DATA_DIR}/legal_amazon_boundary.geojson`),
    fetchJson(`${DATA_DIR}/attributes.json`),
    fetchJson(`${DATA_DIR}/dictionary.json`)
  ]).then(([munic, states, legalAmazon, attrs, dict]) => {
    municGeo = munic;
    statesGeo = states;
    legalAmazonGeo = legalAmazon;
    dictionary = dict;

    attributesByYear = groupByYear(attrs);
    fullDomainByVar = computeFullDomains(attrs, dict.pt.map((d) => d.var));
    statesList = computeStatesList(attrs);
    municMetaByCodIbge = buildMunicMeta(attrs);

    initState();
    initMap();
    buildMapLayer();
    initControls();
    initSparklineHover();
    render();
    document.getElementById("spinner").classList.add("hidden");
  }).catch((err) => {
    // Os dados principais falharam, então não há mapa nenhum para mostrar.
    // Isto antes levantava um alert() pedindo para conferir o console e
    // rodar o script de export — recado para quem desenvolve, não para
    // quem abriu a página. O detalhe fica no console; a página só diz que
    // não carregou e oferece recarregar.
    //
    // initState() não chegou a rodar, então o idioma vem direto da URL.
    console.error("Failed to load data", err);
    document.getElementById("spinner").classList.add("hidden");
    const lang = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "pt";
    const t = I18N[lang];
    const panel = document.createElement("div");
    panel.className = "fatal-error";
    panel.innerHTML =
      `<p class="fatal-error-text">${escapeHtml(t.label_load_error)}</p>` +
      `<button type="button" class="retry-btn" id="fatal-reload">${escapeHtml(t.label_retry)}</button>`;
    document.querySelector(".map-wrap").appendChild(panel);
    document.getElementById("fatal-reload").addEventListener("click", () => location.reload());
  });

  function fetchJson(url) {
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json();
    });
  }

  function computeStatesList(rows) {
    return Array.from(new Set(rows.map((r) => r.estado))).sort();
  }

  function buildMunicMeta(rows) {
    const meta = new Map();
    for (const row of rows) {
      if (!meta.has(row.cod_ibge)) meta.set(row.cod_ibge, { estado: row.estado, nome: row.nm_municip });
    }
    return meta;
  }

  function groupByYear(rows) {
    const byYear = new Map();
    for (const row of rows) {
      if (!byYear.has(row.ano)) byYear.set(row.ano, new Map());
      byYear.get(row.ano).set(row.cod_ibge, row);
    }
    return byYear;
  }

  function computeFullDomains(rows, vars) {
    // Mirrors `domain = df[[input$x]]` in server.R: the color scale is
    // fit against values across ALL years, so bins stay stable while
    // scrubbing the year slider.
    const domains = {};
    for (const v of vars) domains[v] = [];
    for (const row of rows) {
      for (const v of vars) {
        const val = row[v];
        if (val !== null && val !== undefined && !Number.isNaN(val)) domains[v].push(val);
      }
    }
    return domains;
  }

  // ---- State init from query string (mirrors update_my_inputs() in server.R) ----

  function initState() {
    const params = new URLSearchParams(location.search);
    const qLang = params.get("lang");
    const qX = params.get("x");
    const qFilter = params.get("filter");

    state.lang = qLang === "en" ? "en" : "pt";
    state.x = dictionary.pt.some((d) => d.var === qX) ? qX : dictionary.pt[0].var;
    const qYear = qFilter ? parseInt(qFilter, 10) : NaN;
    state.year = Number.isFinite(qYear) && qYear >= dictionary.year_inicio && qYear <= dictionary.year_final
      ? qYear
      : dictionary.year_final;
  }

  function updateUrl() {
    const params = new URLSearchParams();
    params.set("lang", state.lang);
    params.set("x", state.x);
    params.set("filter", state.year);
    history.replaceState(null, "", `?${params.toString()}`);
  }

  // ---- Map setup ----

  // Builds the map instance: tiles, panes, boundary lines.
  function createBaseMap(containerId) {
    const m = L.map(containerId, { zoomControl: true }).setView([-7, -58], 5);

    // NOTE: the original app uses CartoDB.PositronNoLabels (no-label light
    // basemap), but Carto retired free anonymous raster tile access — that
    // style now needs an API key. Esri's World_Light_Gray_Base is the
    // closest free, no-key equivalent: light, minimal roads, no labels
    // fighting the choropleth for attention (stock OSM tiles are far busier).
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
      maxZoom: 16,
      // Esri's tile server sends Access-Control-Allow-Origin: * — this asks
      // the browser to actually fetch tiles in CORS mode instead of the
      // default opaque cross-origin request, which is what lets
      // captureSnapshot() draw them onto a canvas at all: an image loaded
      // without crossOrigin taints any canvas it's drawn to (toBlob/toDataURL
      // throw) regardless of what headers the server sends, and this can't
      // be fixed retroactively — it has to be set before the tile's first
      // fetch, i.e. here.
      crossOrigin: true
    }).addTo(m);

    // Explicit panes/z-index for every layer (rather than relying on add
    // order within the shared default pane) so stacking is guaranteed, not
    // incidental.
    m.createPane("paneMain");
    m.getPane("paneMain").style.zIndex = 400;
    m.createPane("paneBoundaries");
    m.getPane("paneBoundaries").style.zIndex = 450;

    L.geoJSON(statesGeo, { pane: "paneBoundaries", style: { color: "grey", weight: 1, fill: false }, interactive: false }).addTo(m);
    L.geoJSON(legalAmazonGeo, { pane: "paneBoundaries", style: { color: "black", weight: 2, fill: false }, interactive: false }).addTo(m);

    return m;
  }

  function makeLegendControl(targetMap) {
    const control = L.control({ position: "bottomright" });
    control.onAdd = function () {
      this._div = L.DomUtil.create("div", "legend");
      return this._div;
    };
    control.addTo(targetMap);
    return control;
  }

  function initMap() {
    map = createBaseMap("map");
    legendControl = makeLegendControl(map);
  }

  // ---- Controls ----

  function initControls() {
    const xSelect = document.getElementById("x-select");
    xSelect.addEventListener("change", () => {
      state.x = xSelect.value;
      updateUrl();
      render();
    });

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

    document.getElementById("compare-toggle").addEventListener("click", () => {
      setCompareMode(!state.compareMode);
    });

    initCompareMarkers();

    const stateSelect = document.getElementById("compare-state-select");
    for (const uf of statesList) {
      const opt = document.createElement("option");
      opt.value = uf;
      opt.textContent = STATE_NAMES[uf] ? `${STATE_NAMES[uf]} (${uf})` : uf;
      stateSelect.appendChild(opt);
    }
    stateSelect.addEventListener("change", () => {
      state.compareState = stateSelect.value;
      updateDumbbellChart();
    });

    document.getElementById("snapshot-btn").addEventListener("click", captureSnapshot);
  }

  // Shared by the sparkline's click-to-jump and hover-preview: which year
  // does this pointer position (over the sparkline wrapper) correspond to.
  function yearFromPointerEvent(e) {
    const rect = document.querySelector(".sparkline-wrap").getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const year = Math.round(dictionary.year_inicio + frac * (dictionary.year_final - dictionary.year_inicio));
    return Math.min(dictionary.year_final, Math.max(dictionary.year_inicio, year));
  }

  // Hover crosshair + tooltip on the sparkline (dataviz skill's interaction
  // spec: "the crosshair finds the X" — a vertical hairline snaps to the
  // nearest data position, with a tooltip, independent of the persistent
  // .spark-guide/.spark-marker that mark the currently *selected* year).
  function initSparklineHover() {
    const wrap = document.querySelector(".sparkline-wrap");
    const hoverLine = document.getElementById("spark-hover-line");
    const hoverMarker = document.getElementById("spark-hover-marker");
    const tooltip = document.getElementById("spark-tooltip");

    wrap.addEventListener("pointermove", (e) => {
      if (!sparkXFor || state.compareMode) return; // compare mode has its own markers/guides for A and B
      const year = yearFromPointerEvent(e);
      const d = sparkSeries.find((s) => s.year === year);
      const svgX = sparkXFor(year);

      hoverLine.setAttribute("x1", svgX);
      hoverLine.setAttribute("x2", svgX);
      hoverLine.style.opacity = "1";

      const dict = dictionary[state.lang];
      const varMeta = dict.find((v) => v.var === state.x);
      const t = I18N[state.lang];

      if (d && d.value !== null) {
        hoverMarker.setAttribute("cx", svgX);
        hoverMarker.setAttribute("cy", sparkYFor(d.value));
        hoverMarker.style.opacity = "1";
        tooltip.innerHTML = "<strong>" + fmtNumber(d.value) + "</strong> " + varMeta.unidade + "<br>" + year;
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

  // ---- Compare mode: two draggable year markers on the sparkline (year A,
  // year B — an identity pair, categorical slots 1/2 blue/orange) driving a
  // swipe divider on the map. ----

  function initCompareMarkers() {
    const markerA = document.getElementById("spark-marker-a");
    const markerB = document.getElementById("spark-marker-b");
    let dragging = null; // "a" | "b" | null

    function onMove(e) {
      if (!dragging || !sparkXFor) return;
      const year = yearFromPointerEvent(e);
      if (dragging === "a") state.yearA = year; else state.yearB = year;
      updateCompareYearPositions();
      updateDumbbellChart();
      updateCompareLabels();
    }

    markerA.addEventListener("pointerdown", (e) => { dragging = "a"; markerA.setPointerCapture(e.pointerId); });
    markerB.addEventListener("pointerdown", (e) => { dragging = "b"; markerB.setPointerCapture(e.pointerId); });
    markerA.addEventListener("pointermove", onMove);
    markerB.addEventListener("pointermove", onMove);
    markerA.addEventListener("pointerup", () => { dragging = null; });
    markerB.addEventListener("pointerup", () => { dragging = null; });
  }

  function updateCompareYearPositions() {
    if (!sparkXFor) return;
    placeCompareMarker("a", state.yearA);
    placeCompareMarker("b", state.yearB);
  }

  function placeCompareMarker(which, year) {
    const marker = document.getElementById("spark-marker-" + which);
    const guide = document.getElementById("spark-guide-" + which);
    const x = sparkXFor(year);
    guide.setAttribute("x1", x);
    guide.setAttribute("x2", x);
    const d = sparkSeries.find((s) => s.year === year);
    if (d && d.value !== null) {
      marker.setAttribute("cx", x);
      marker.setAttribute("cy", sparkYFor(d.value));
      marker.setAttribute("opacity", "1");
    } else {
      marker.setAttribute("opacity", "0");
    }
  }

  function updateCompareLabels() {
    document.getElementById("compare-legend-a-label").textContent = state.yearA;
    document.getElementById("compare-legend-b-label").textContent = state.yearB;
  }

  function setCompareMode(on) {
    state.compareMode = on;
    document.querySelector(".apppanel").classList.toggle("compare-mode", on);
    document.getElementById("compare-toggle").classList.toggle("active", on);
    document.getElementById("compare-toggle-label").textContent =
      I18N[state.lang][on ? "btn_compare_exit" : "btn_compare"];

    if (on) {
      stopPlaying();
      // In case the single-year hover crosshair was mid-display when the
      // toggle was clicked — it stops updating in compare mode (see
      // initSparklineHover) but was already visible.
      document.getElementById("spark-hover-line").style.opacity = "0";
      document.getElementById("spark-hover-marker").style.opacity = "0";
      document.getElementById("spark-tooltip").style.opacity = "0";
      if (state.yearA == null) state.yearA = dictionary.year_inicio;
      if (state.yearB == null) state.yearB = dictionary.year_final;
      if (state.compareState == null) state.compareState = statesList[0];
      document.getElementById("compare-state-select").value = state.compareState;

      updateCompareYearPositions();
      updateCompareLabels();
      updateDumbbellChart();
    } else {
      updateMapColors();
    }
  }

  function paintYear(layersMap, year, breaks, colors, varMeta, t) {
    const yearData = attributesByYear.get(year) || new Map();
    for (const [codIbge, layer] of layersMap) {
      const row = yearData.get(codIbge);
      const value = row ? row[state.x] : null;
      const color = value === null || value === undefined || Number.isNaN(value)
        ? "url(#" + NODATA_PATTERN_ID + ")"
        : colors[binIndex(value, breaks)];

      layer.setStyle({ fillColor: color, color: strokeColorFor(color) });
      layer.setTooltipContent(tooltipHtml(t, varMeta, row, value));
    }
  }

  function tooltipHtml(t, varMeta, row, value) {
    return [
      t.label_munic_name, row ? escapeHtml(row.nm_municip) : "—", "</b><br>",
      t.label_state_name, row ? row.estado : "—", "</b><br>",
      varMeta.label, ": <b>", fmtNumber(value), "</b><br>",
      t.label_measurement_unit, varMeta.unidade, "</b>"
    ].join("");
  }

  // ---- Compare mode: ranked dumbbell chart. Filtered to one state
  // (state.compareState) at a time — see the style.css comment above
  // .compare-panel for why. Sorted by (valueB - valueA) descending, so the
  // biggest gainers land at the top; dot color is a fixed identity pair
  // (year A = blue, year B = orange, same slots the sparkline's draggable
  // markers use) rather than encoding which value is larger. ----

  function computeDumbbellRows(varName, yearA, yearB, uf) {
    const dataA = attributesByYear.get(yearA) || new Map();
    const dataB = attributesByYear.get(yearB) || new Map();
    const rows = [];
    let missing = 0;

    for (const [codIbge, meta] of municMetaByCodIbge) {
      if (meta.estado !== uf) continue;
      const rowA = dataA.get(codIbge);
      const rowB = dataB.get(codIbge);
      const valueA = rowA ? rowA[varName] : null;
      const valueB = rowB ? rowB[varName] : null;
      if (valueA === null || valueA === undefined || Number.isNaN(valueA) ||
          valueB === null || valueB === undefined || Number.isNaN(valueB)) {
        missing++;
        continue;
      }
      rows.push({ codIbge, nome: meta.nome, valueA, valueB, delta: valueB - valueA });
    }

    rows.sort((a, b) => b.delta - a.delta);
    return { rows, missing };
  }

  // A domain fit to just the selected state + years (not the map's global,
  // all-years domain) — states vary hugely in scale, and a ranked list is
  // read within one state at a time, so a locally-fit axis keeps the dots
  // spread out and readable rather than compressed into a shared extreme.
  function dumbbellDomain(rows) {
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

  function pctFor(value, domain) {
    return ((value - domain.min) / (domain.max - domain.min)) * 100;
  }

  function updateDumbbellChart() {
    const dict = dictionary[state.lang];
    const varMeta = dict.find((d) => d.var === state.x);
    const t = I18N[state.lang];

    const { rows, missing } = computeDumbbellRows(state.x, state.yearA, state.yearB, state.compareState);
    const domain = dumbbellDomain(rows);
    dumbbellRender = { rows, missing, domain, varMeta, uf: state.compareState, yearA: state.yearA, yearB: state.yearB };

    document.getElementById("dumbbell-axis-min").textContent = fmtNumber(domain.min);
    document.getElementById("dumbbell-axis-max").textContent = fmtNumber(domain.max);

    const container = document.getElementById("dumbbell-rows");
    container.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const r of rows) frag.appendChild(buildDumbbellRowEl(r, domain, varMeta));
    container.appendChild(frag);

    const note = document.getElementById("dumbbell-note");
    if (missing > 0) {
      note.textContent = t.dumbbell_note(missing);
      note.classList.remove("hidden");
    } else {
      note.textContent = "";
      note.classList.add("hidden");
    }
  }

  function buildDumbbellRowEl(r, domain, varMeta) {
    const pctA = pctFor(r.valueA, domain);
    const pctB = pctFor(r.valueB, domain);
    const lo = Math.min(pctA, pctB);
    const hi = Math.max(pctA, pctB);

    const row = document.createElement("div");
    row.className = "dumbbell-row";

    const label = document.createElement("div");
    label.className = "dumbbell-col-label";
    label.textContent = r.nome;
    row.appendChild(label);

    const track = document.createElement("div");
    track.className = "dumbbell-col-track";
    const line = document.createElement("div");
    line.className = "dumbbell-line";
    line.style.left = lo + "%";
    line.style.width = (hi - lo) + "%";
    track.appendChild(line);
    const dotA = document.createElement("div");
    dotA.className = "dumbbell-dot dumbbell-dot-a";
    dotA.style.left = pctA + "%";
    track.appendChild(dotA);
    const dotB = document.createElement("div");
    dotB.className = "dumbbell-dot dumbbell-dot-b";
    dotB.style.left = pctB + "%";
    track.appendChild(dotB);
    row.appendChild(track);

    const delta = document.createElement("div");
    delta.className = "dumbbell-col-delta";
    delta.textContent = (r.delta > 0 ? "+" : "") + fmtNumber(r.delta);
    row.appendChild(delta);

    row.addEventListener("pointerenter", (e) => showDumbbellTooltip(e, r, varMeta));
    row.addEventListener("pointermove", moveDumbbellTooltip);
    row.addEventListener("pointerleave", hideDumbbellTooltip);

    return row;
  }

  function showDumbbellTooltip(e, r) {
    const tooltip = document.getElementById("dumbbell-tooltip");
    const pct = r.valueA !== 0 ? (r.delta / Math.abs(r.valueA)) * 100 : null;
    tooltip.innerHTML =
      "<strong>" + r.nome + "</strong><br>" +
      state.yearA + ": " + fmtNumber(r.valueA) + "<br>" +
      state.yearB + ": " + fmtNumber(r.valueB) + "<br>" +
      (r.delta >= 0 ? "+" : "") + fmtNumber(r.delta) +
      (pct !== null ? " (" + (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%)" : "");
    tooltip.style.opacity = "1";
    moveDumbbellTooltip(e);
  }

  function moveDumbbellTooltip(e) {
    const tooltip = document.getElementById("dumbbell-tooltip");
    const panelRect = document.getElementById("compare-panel").getBoundingClientRect();
    tooltip.style.left = (e.clientX - panelRect.left + 12) + "px";
    tooltip.style.top = (e.clientY - panelRect.top + 12) + "px";
  }

  function hideDumbbellTooltip() {
    document.getElementById("dumbbell-tooltip").style.opacity = "0";
  }

  // ---- Snapshot: composite the live map (basemap tiles + choropleth/
  // boundary SVG) onto a canvas, draw a title/legend on top from the same
  // app state the on-screen legend uses, and download it as a PNG. ----

  async function captureSnapshot() {
    const btn = document.getElementById("snapshot-btn");
    const label = document.getElementById("snapshot-btn-label");
    const t = I18N[state.lang];
    btn.disabled = true;
    label.textContent = t.btn_snapshot_busy;

    try {
      const dpr = window.devicePixelRatio || 1;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (state.compareMode) {
        await renderDumbbellSnapshot(canvas, ctx, dpr);
      } else {
        await renderMapSnapshot(canvas, ctx, dpr);
      }

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = snapshotFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      // Falha de ação do usuário: mostra no próprio botão por alguns
      // segundos em vez de abrir um alert(), que bloqueia a página inteira
      // por causa de um PNG que não saiu.
      console.error("Snapshot failed", err);
      btn.classList.add("snapshot-error");
      label.textContent = t.snapshot_error;
      setTimeout(() => {
        btn.classList.remove("snapshot-error");
        label.textContent = t.btn_snapshot;
        btn.disabled = false;
      }, 4000);
      return;
    } finally {
      btn.disabled = false;
      label.textContent = t.btn_snapshot;
    }
  }

  // Single-year snapshot: composite the live map onto the canvas, then a
  // title/legend header on top from the same app state the on-screen legend
  // uses. Title lives in a dedicated strip ABOVE the map content (canvas
  // made taller, map content shifted down by it) rather than overlaid on
  // top of it, which used to hide the top sliver of the map.
  async function renderMapSnapshot(canvas, ctx, dpr) {
    const refEl = document.getElementById("map");
    const refRect = refEl.getBoundingClientRect();
    const totalW = refRect.width;
    const totalH = refRect.height + SNAPSHOT_TITLE_BAND_H;

    canvas.width = Math.round(totalW * dpr);
    canvas.height = Math.round(totalH * dpr);
    ctx.scale(dpr, dpr);

    await drawMapContentOnto(ctx, refEl, refRect);
    const logo = await getTintedLogo();
    drawMapSnapshotOverlay(ctx, totalW, totalH, logo);
  }

  // Draws the map's tiles + choropleth/boundary SVGs onto ctx, offset by
  // the map's own position relative to refRect (the canvas's origin).
  async function drawMapContentOnto(ctx, mapEl, refRect) {
    const mapRect = mapEl.getBoundingClientRect();
    const ox = mapRect.left - refRect.left;
    const oy = mapRect.top - refRect.top + SNAPSHOT_TITLE_BAND_H;

    // Basemap tiles. Each tile's getBoundingClientRect() already reflects
    // Leaflet's internal pane/tile transforms post-resolution, so drawing
    // at that rect (relative to the map container) lines up correctly
    // without re-deriving any of Leaflet's own transform math.
    const tiles = mapEl.querySelectorAll(".leaflet-tile-pane img.leaflet-tile-loaded");
    for (const tile of tiles) {
      const r = tile.getBoundingClientRect();
      try {
        ctx.drawImage(tile, ox + (r.left - mapRect.left), oy + (r.top - mapRect.top), r.width, r.height);
      } catch (err) {
        // A tainted or not-yet-decoded tile — skip it rather than losing
        // the whole capture over one missing tile.
        console.warn("Snapshot: skipped a tile", err);
      }
    }

    // Choropleth fill + state/country boundaries: each of our two map-data
    // panes (paneMain, paneBoundaries) gets its own <svg> root. Serializing
    // and redrawing each as an image is simpler and more robust than
    // walking Leaflet's internal layer objects, and needs no CORS handling
    // since it's an inline data: URI.
    //
    // Scoped to those two panes specifically, not a blanket "svg" query:
    // that also matches Leaflet's own UI-chrome SVGs (e.g. the tiny 12x8
    // flag icon in the attribution control), which would otherwise get
    // rasterized and stamped onto the map content at whatever screen
    // position that control happens to occupy.
    const svgs = mapEl.querySelectorAll(".leaflet-paneMain-pane svg, .leaflet-paneBoundaries-pane svg");
    for (const svg of svgs) {
      const r = svg.getBoundingClientRect();

      // Leaflet's SVG renderer draws onto an oversized <svg> (buffered past
      // the visible viewport so panning doesn't need a redraw) and slides it
      // into place with an inline `transform: translate3d(...)` on the <svg>
      // element itself — getBoundingClientRect() above already reflects that
      // transform. Serializing the element as-is bakes the same transform
      // into the standalone rasterized copy too, so it gets applied a SECOND
      // time (once inside the image's own self-contained canvas, once again
      // by us positioning that image at r.left/r.top) — the choropleth and
      // boundaries end up shifted relative to the basemap tiles by however
      // much Leaflet's current pan buffer offset is. Stripping the transform
      // before serializing leaves just the viewBox mapping, which is what
      // actually needs to land at r.left/r.top.
      const clone = svg.cloneNode(true);
      clone.style.transform = "none";
      const svgText = new XMLSerializer().serializeToString(clone);
      const img = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText));
      ctx.drawImage(img, ox + (r.left - mapRect.left), oy + (r.top - mapRect.top), r.width, r.height);
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // The sidebar logo asset is white-on-transparent (meant for the green
  // sidebar), which would be invisible on the white title band exported
  // snapshots use. Recolors it to CANVAS_INK once via canvas compositing
  // (draw the source, then "source-in" fill with the target color — keeps
  // the original alpha shape, replaces its color) rather than shipping a
  // second logo asset just for this. Cached: every snapshot after the
  // first reuses the same tinted canvas instead of re-decoding+re-tinting.
  let logoTintedCanvas = null;
  async function getTintedLogo() {
    if (logoTintedCanvas) return logoTintedCanvas;
    const img = await loadImage(LOGO_URL);
    const off = document.createElement("canvas");
    off.width = img.naturalWidth;
    off.height = img.naturalHeight;
    const octx = off.getContext("2d");
    octx.drawImage(img, 0, 0);
    octx.globalCompositeOperation = "source-in";
    octx.fillStyle = CANVAS_INK;
    octx.fillRect(0, 0, off.width, off.height);
    logoTintedCanvas = off;
    return off;
  }

  // Draws the (already-tinted) logo at a fixed height, right-aligned to x,
  // vertically centered on y, preserving its aspect ratio.
  function drawLogoWatermark(ctx, logo, rightX, centerY, targetH) {
    const w = (logo.width / logo.height) * targetH;
    ctx.drawImage(logo, rightX - w, centerY - targetH / 2, w, targetH);
  }

  function snapshotFilename() {
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
    const yearPart = state.compareMode
      ? `${state.compareState}_${state.yearA}-vs-${state.yearB}`
      : String(state.year);
    return `datazoom_cempre_${state.x}_${yearPart}_${stamp}.png`;
  }

  // Everything baked into the exported image beyond the raw map pixels:
  // title, the year, the legend, and attribution — all read from the same
  // state/dictionary the on-screen UI uses, not scraped from the DOM.
  function drawMapSnapshotOverlay(ctx, width, height, logo) {
    const t = I18N[state.lang];
    const dict = dictionary[state.lang];
    const varMeta = dict.find((d) => d.var === state.x);
    const { breaks, colors } = getBreaksAndColors(state.x);
    const fontUi = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

    ctx.textBaseline = "top";
    // Solid, not translucent: this is a dedicated header strip now (see
    // captureSnapshot/SNAPSHOT_TITLE_BAND_H), not an overlay painted over
    // real map content, so there's nothing underneath it to blend with.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, SNAPSHOT_TITLE_BAND_H);
    ctx.fillStyle = CANVAS_INK;
    ctx.font = `700 15px ${fontUi}`;
    ctx.fillText(t.label_title, 12, 8);

    ctx.font = `400 12px ${fontUi}`;
    ctx.fillStyle = CANVAS_MUTED;
    ctx.fillText(`${t.label_var_name} ${varMeta.label} (${state.year})`, 12, 29);

    drawLogoWatermark(ctx, logo, width - 14, SNAPSHOT_TITLE_BAND_H / 2, 22);

    drawLegendOnCanvas(ctx, fontUi, width, height, breaks, colors, `${varMeta.label} (${varMeta.unidade})`, t.label_no_data);

    ctx.font = `400 10px ${fontUi}`;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.textAlign = "right";
    ctx.fillText("Tiles © Esri — Esri, DeLorme, NAVTEQ | Leaflet | datazoom.com.br/amazonia", width - 6, height - 14);
    ctx.textAlign = "left";
  }

  // Compare-mode snapshot: draws the ranked dumbbell chart procedurally
  // (line + two dots + labels per row), mirroring drawLegendOnCanvas's
  // approach rather than rasterizing the live DOM — there's no Leaflet map/
  // tiles/CORS concern here, just our own layout math. Draws every row, not
  // just whatever's scrolled into view: a "save image" of a ranked list
  // should be the whole ranking.
  async function renderDumbbellSnapshot(canvas, ctx, dpr) {
    const t = I18N[state.lang];
    const fontUi = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
    const data = dumbbellRender;
    const { rows, domain, varMeta, uf, yearA, yearB, missing } = data;
    const logo = await getTintedLogo();

    const panelRect = document.getElementById("compare-panel").getBoundingClientRect();
    const totalW = panelRect.width;
    const trackX0 = DUMBBELL_LABEL_W;
    const trackW = totalW - DUMBBELL_LABEL_W - DUMBBELL_DELTA_W;
    const noteH = missing > 0 ? 22 : 0;
    const totalH = SNAPSHOT_TITLE_BAND_H + COMPARE_LEGEND_BAND_H + rows.length * DUMBBELL_ROW_H + noteH + 26;

    canvas.width = Math.round(totalW * dpr);
    canvas.height = Math.round(totalH * dpr);
    ctx.scale(dpr, dpr);
    ctx.textBaseline = "top";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, totalW, totalH);
    ctx.fillStyle = CANVAS_INK;
    ctx.font = `700 15px ${fontUi}`;
    ctx.fillText(t.label_title, 12, 8);
    ctx.font = `400 12px ${fontUi}`;
    ctx.fillStyle = CANVAS_MUTED;
    const ufLabel = STATE_NAMES[uf] ? `${STATE_NAMES[uf]} (${uf})` : uf;
    ctx.fillText(`${varMeta.label} — ${ufLabel}`, 12, 29);

    drawLogoWatermark(ctx, logo, totalW - 14, SNAPSHOT_TITLE_BAND_H / 2, 22);

    const ly = SNAPSHOT_TITLE_BAND_H + 10;
    drawSnapshotLegendChip(ctx, fontUi, 14, ly, "#2a78d6", String(yearA));
    drawSnapshotLegendChip(ctx, fontUi, 100, ly, "#eb6834", String(yearB));

    ctx.font = `400 10px ${fontUi}`;
    ctx.fillStyle = "#888";
    ctx.fillText(fmtNumber(domain.min), trackX0, ly + 2);
    ctx.textAlign = "right";
    ctx.fillText(fmtNumber(domain.max), trackX0 + trackW, ly + 2);
    ctx.textAlign = "left";

    let ry = SNAPSHOT_TITLE_BAND_H + COMPARE_LEGEND_BAND_H;
    ctx.font = `400 11px ${fontUi}`;
    for (const r of rows) {
      const cy = ry + DUMBBELL_ROW_H / 2;
      const xA = trackX0 + (pctFor(r.valueA, domain) / 100) * trackW;
      const xB = trackX0 + (pctFor(r.valueB, domain) / 100) * trackW;

      ctx.fillStyle = CANVAS_INK;
      ctx.fillText(wrapCanvasText(ctx, r.nome, DUMBBELL_LABEL_W - DUMBBELL_PAD_L - 4)[0], DUMBBELL_PAD_L, cy - 5);

      ctx.strokeStyle = "#c7c7c7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.min(xA, xB), cy);
      ctx.lineTo(Math.max(xA, xB), cy);
      ctx.stroke();

      drawSnapshotDot(ctx, xA, cy, "#2a78d6");
      drawSnapshotDot(ctx, xB, cy, "#eb6834");

      ctx.fillStyle = CANVAS_INK;
      ctx.textAlign = "right";
      ctx.fillText((r.delta > 0 ? "+" : "") + fmtNumber(r.delta), totalW - DUMBBELL_PAD_R, cy - 5);
      ctx.textAlign = "left";

      ry += DUMBBELL_ROW_H;
    }

    if (missing > 0) {
      ctx.font = `400 11px ${fontUi}`;
      ctx.fillStyle = "#888";
      ctx.fillText(t.dumbbell_note(missing), DUMBBELL_PAD_L, ry + 4);
      ry += noteH;
    }

    ctx.font = `400 10px ${fontUi}`;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.textAlign = "right";
    ctx.fillText("datazoom.com.br/amazonia", totalW - 6, totalH - 16);
    ctx.textAlign = "left";
  }

  function drawSnapshotLegendChip(ctx, fontUi, x, y, color, text) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 5, y + 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CANVAS_INK;
    ctx.font = `700 12px ${fontUi}`;
    ctx.fillText(text, x + 14, y);
  }

  function drawSnapshotDot(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapCanvasText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawLegendOnCanvas(ctx, fontUi, width, height, breaks, colors, title, noDataLabel) {
    const pad = 10;
    const rowH = 18;
    const swatch = 14;
    const boxW = 232;
    const innerW = boxW - pad * 2 - swatch - 6;

    ctx.font = `700 12px ${fontUi}`;
    const titleLines = wrapCanvasText(ctx, title, boxW - pad * 2);

    const rows = colors.length + 1; // + no-data row
    const boxH = pad * 2 + titleLines.length * 16 + 4 + rows * rowH;
    const boxX = width - boxW - 10;
    const boxY = height - boxH - 10;

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    roundRectPath(ctx, boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    let cy = boxY + pad;
    ctx.fillStyle = CANVAS_INK;
    ctx.font = `700 12px ${fontUi}`;
    for (const line of titleLines) {
      ctx.fillText(line, boxX + pad, cy);
      cy += 16;
    }
    cy += 4;

    ctx.font = `400 11px ${fontUi}`;
    for (let i = colors.length - 1; i >= 0; i--) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(boxX + pad, cy + 2, swatch, swatch);
      ctx.fillStyle = CANVAS_INK;
      const label = `${fmtNumber(breaks[i])} – ${fmtNumber(breaks[i + 1])}`;
      ctx.fillText(wrapCanvasText(ctx, label, innerW)[0], boxX + pad + swatch + 6, cy + 3);
      cy += rowH;
    }

    // "No data" row, matching the hatch swatch used on the map/legend.
    ctx.fillStyle = "#e4e2dd";
    ctx.fillRect(boxX + pad, cy + 2, swatch, swatch);
    ctx.strokeStyle = "#b8b5ae";
    ctx.beginPath();
    ctx.moveTo(boxX + pad, cy + 2 + swatch);
    ctx.lineTo(boxX + pad + swatch, cy + 2);
    ctx.stroke();
    ctx.fillStyle = CANVAS_INK;
    ctx.fillText(noDataLabel, boxX + pad + swatch + 6, cy + 3);
  }

  // Applies state.year to every year-dependent bit of UI (slider position,
  // map colors, sparkline marker) without touching the play/pause state —
  // this is the tick handler for autoplay.
  function applyYear(newYear) {
    state.year = newYear;
    document.getElementById("year-slider").value = newYear;
    document.getElementById("year-value").textContent = newYear;
    updateUrl();
    updateMapColors();
    updateSparklineMarker();
  }

  // User-initiated seek (slider drag, sparkline click) — also stops autoplay.
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
      // Pressing play already sitting on the last year would otherwise just
      // stop immediately on the first tick (year >= year_final) — restart
      // from the first year instead, so play always plays something.
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

  // ---- Rendering ----

  function render() {
    const t = I18N[state.lang];
    const dict = dictionary[state.lang];

    document.getElementById("plot_name").textContent = t.plot_name;
    document.getElementById("plot_desc").textContent = t.plot_desc;
    document.getElementById("label_var_name").textContent = t.label_var_name;
    document.getElementById("label_x_name").textContent = t.label_x_name;
    document.getElementById("label_year").textContent = t.label_year;
    document.getElementById("plot-title").textContent = t.label_title;
    document.getElementById("lang-toggle-label").textContent = t.btn_lang;
    // index.html nasce com lang="pt-BR"; sem isto um leitor de tela lê o
    // conteúdo em inglês com fonética portuguesa. Aqui, e não no handler do
    // toggle, para cobrir também o carregamento com ?lang=en.
    document.documentElement.lang = numLocale();
    document.getElementById("label_compare_state").textContent = t.label_compare_state;
    if (!document.getElementById("snapshot-btn").disabled) {
      document.getElementById("snapshot-btn-label").textContent = t.btn_snapshot;
    }

    const xSelect = document.getElementById("x-select");
    const prevValue = state.x;
    xSelect.innerHTML = "";
    for (const entry of dict) {
      const opt = document.createElement("option");
      opt.value = entry.var;
      opt.textContent = entry.label;
      xSelect.appendChild(opt);
    }
    xSelect.value = prevValue;

    const slider = document.getElementById("year-slider");
    slider.value = state.year;
    document.getElementById("year-value").textContent = state.year;

    const varMeta = dict.find((d) => d.var === state.x);
    document.getElementById("plot-subtitle").textContent = `${t.label_var_name} ${varMeta.label}`;

    document.getElementById("compare-toggle-label").textContent =
      t[state.compareMode ? "btn_compare_exit" : "btn_compare"];

    renderSparkline();
    if (state.compareMode) {
      updateCompareYearPositions();
      updateDumbbellChart();
      updateCompareLabels();
    } else {
      updateMapColors();
    }
  }

  // Injects an SVG <pattern> for the "no data" fill into the given map
  // container's own SVG renderer, so polygons in that map can set fillColor
  // to `url(#nodata-hatch)` — a valid SVG paint reference, same as any
  // other setStyle value. Must run after that map's first polygon layer
  // exists (that's what makes Leaflet create its SVG root), and once per
  // map container, since each Leaflet map instance gets its own SVG root.
  function ensureNoDataPattern(containerId) {
    var svg = document.querySelector("#" + containerId + " svg");
    if (!svg || svg.querySelector("#" + NODATA_PATTERN_ID)) return;
    var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML =
      '<pattern id="' + NODATA_PATTERN_ID + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="6" height="6" fill="' + NODATA_BASE + '"></rect>' +
      '<line x1="0" y1="0" x2="0" y2="6" stroke="' + NODATA_LINE + '" stroke-width="2"></line>' +
      "</pattern>";
    svg.insertBefore(defs, svg.firstChild);
  }

  // Builds the 772 municipality polygons ONCE, into layersByCodIbge, wiring
  // up hover/tooltip behavior that doesn't change across renders. Every
  // subsequent variable/year/lang change goes through updateMapColors()
  // instead of rebuilding the layer — see the layersByCodIbge comment above.
  function buildMapLayer() {
    let openTooltipLayer = null;

    L.geoJSON(municGeo, {
      pane: "paneMain",
      style: () => ({
        className: "muni-path",
        // A thin stroke in the *same color as the fill* (see
        // strokeColorFor), not stroke:false. Adjacent unstroked SVG
        // polygons each anti-alias their own edge independently, and at
        // low zoom — many small municipalities packed into a small screen
        // area — those sub-pixel seams show up as a visible hairline gap
        // network exposing the basemap underneath; the same ~1px seam is
        // imperceptible once a polygon is large on screen, which is why it
        // disappears when zooming in. A matching-color stroke fills the
        // seam instead of trying to eliminate anti-aliasing itself.
        stroke: true,
        weight: 1,
        fillOpacity: 0.9,
        fillColor: "#cccccc", // placeholder; the first color update repaints before this ever renders a frame
        color: "#cccccc"
      }),
      onEachFeature: (feature, layer) => {
        layersByCodIbge.set(feature.properties.cod_ibge, layer);
        layer.bindTooltip("", { sticky: true });

        layer.on("mouseover", () => {
          if (openTooltipLayer && openTooltipLayer !== layer) openTooltipLayer.closeTooltip();
          openTooltipLayer = layer;
          layer.setStyle({ weight: 5, color: "black", opacity: 1, fillOpacity: 1 });
          layer.bringToFront();
        });
        layer.on("mouseout", () => {
          if (openTooltipLayer === layer) openTooltipLayer = null;
          // Explicit rest style rather than layer.resetStyle(): resetStyle
          // reverts to the style captured when the layer was created, which
          // would snap fillColor back to the very first year ever shown
          // instead of the current one. Omitting fillColor here keeps
          // whatever the last color update set (setStyle merges options).
          // color (the seam-hiding stroke) does need restoring here, since
          // mouseover just overwrote it with the highlight's black.
          layer.setStyle({ weight: 1, opacity: 1, fillOpacity: 0.9, color: strokeColorFor(layer.options.fillColor) });
        });
      }
    }).addTo(map);

    ensureNoDataPattern("map");
  }

  function getBreaksAndColors(varName) {
    if (!breaksCache[varName]) {
      const breaks = prettyBreaks(fullDomainByVar[varName], N_BINS);
      const colors = samplePalette(PALETTE_CONTINUOUS, breaks.length - 1);
      breaksCache[varName] = { breaks, colors };
    }
    return breaksCache[varName];
  }

  // Re-colors and re-tooltips the existing polygons for the current
  // variable/year/lang. Changing only `fillColor` on an already-mounted
  // <path> (rather than replacing the element) is what makes the
  // .muni-path CSS transition animate the year-to-year change.
  function updateMapColors() {
    const dict = dictionary[state.lang];
    const varMeta = dict.find((d) => d.var === state.x);
    const t = I18N[state.lang];
    const { breaks, colors } = getBreaksAndColors(state.x);

    paintYear(layersByCodIbge, state.year, breaks, colors, varMeta, t);

    renderLegend(breaks, colors, `${varMeta.label} (${varMeta.unidade})`, t.label_no_data);
  }

  // ---- Sparkline: total value per year for the selected variable, above
  // the slider. Lets you see the shape of the series before scrubbing, and
  // click any point on it to jump straight there. ----

  function computeYearSeries(varName) {
    const series = [];
    for (let y = dictionary.year_inicio; y <= dictionary.year_final; y++) {
      const yearData = attributesByYear.get(y);
      let sum = 0;
      let has = false;
      if (yearData) {
        for (const row of yearData.values()) {
          const v = row[varName];
          if (v !== null && v !== undefined && !Number.isNaN(v)) {
            sum += v;
            has = true;
          }
        }
      }
      series.push({ year: y, value: has ? sum : null });
    }
    return series;
  }

  function renderSparkline() {
    sparkSeries = computeYearSeries(state.x);
    const values = sparkSeries.map((d) => d.value).filter((v) => v !== null);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);

    sparkXFor = (year) => ((year - dictionary.year_inicio) / (dictionary.year_final - dictionary.year_inicio)) * SPARK_W;
    sparkYFor = (value) => (maxV === minV
      ? SPARK_H / 2
      : SPARK_PAD + (1 - (value - minV) / (maxV - minV)) * (SPARK_H - 2 * SPARK_PAD));

    const known = sparkSeries.filter((d) => d.value !== null);
    const pts = known.map((d) => `${sparkXFor(d.year).toFixed(1)},${sparkYFor(d.value).toFixed(1)}`);

    document.getElementById("spark-line").setAttribute("d", pts.length ? `M${pts.join(" L")}` : "");
    document.getElementById("spark-area").setAttribute("d", pts.length
      ? `M${sparkXFor(known[0].year).toFixed(1)},${SPARK_H} L${pts.join(" L")} L${sparkXFor(known[known.length - 1].year).toFixed(1)},${SPARK_H} Z`
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

  function renderLegend(breaks, colors, title, noDataLabel) {
    renderLegendInto(legendControl, breaks, colors, title, noDataLabel);
  }

  function renderLegendInto(control, breaks, colors, title, noDataLabel) {
    const div = control._div;
    let html = `<div class="legend-title">${title}</div>`;
    for (let i = colors.length - 1; i >= 0; i--) {
      html += `<div class="legend-row"><span class="swatch" style="background:${colors[i]}"></span>${fmtNumber(breaks[i])} &ndash; ${fmtNumber(breaks[i + 1])}</div>`;
    }
    html += `<div class="legend-row"><span class="swatch swatch-nodata"></span>${noDataLabel}</div>`;
    div.innerHTML = html;
  }

  // ---- Color scale helpers (approximates leaflet::colorBin(bins = 9), which
  // in turn calls R's base pretty() to pick the bin edges) ----

  // R's pretty() doesn't pick the smallest "nice" step >= the raw step size —
  // it biases toward rounder units (2, 5, 10x a power of ten) using weighted
  // over/undershoot comparisons, not fixed ratio thresholds. A naive port
  // (smallest nice unit >= rawStep, via fixed cutoffs) diverges from R for
  // borderline cases: e.g. domain [2, 25979] has a raw step of ~2886, which
  // a fixed-cutoff version rounds to 2000 (13 bins) but R's pretty() rounds
  // to 5000 (6 bins) — verified against `pretty(c(2, 25979), n = 9)` in R.
  // This ports R's actual bias-corrected unit selection (high.u.bias = 1.5,
  // u5.bias = 0.5 + 1.5*1.5 = 2.75 — R's own defaults) instead, and was
  // checked against R's pretty() across the app's real data domains plus a
  // battery of synthetic ranges (small/large/negative/fractional) — all
  // matched exactly.
  function prettyBreaks(values, n) {
    if (!values.length) return [0, 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return [min, min + 1];

    const H = 1.5; // R's high.u.bias
    const H5 = 0.5 + 1.5 * H; // R's u5.bias

    const cell = (max - min) / n;
    const base = Math.pow(10, Math.floor(Math.log10(cell)));

    let unit = base;
    let candidate = 2 * base;
    if (candidate - cell < H * (cell - unit)) {
      unit = candidate;
      candidate = 5 * base;
      if (candidate - cell < H5 * (cell - unit)) {
        unit = candidate;
        candidate = 10 * base;
        if (candidate - cell < H * (cell - unit)) {
          unit = candidate;
        }
      }
    }

    const niceMin = Math.floor(min / unit + 1e-10) * unit;
    const niceMax = Math.ceil(max / unit - 1e-10) * unit;

    const breaks = [];
    for (let v = niceMin; v <= niceMax + unit / 2; v += unit) {
      breaks.push(Math.round(v * 1e6) / 1e6);
    }
    return breaks;
  }

  function binIndex(value, breaks) {
    for (let i = 0; i < breaks.length - 1; i++) {
      if (value <= breaks[i + 1]) return i;
    }
    return breaks.length - 2;
  }

  function samplePalette(colors, n) {
    if (n <= 1) return [colors[colors.length - 1]];
    const result = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const pos = t * (colors.length - 1);
      const lo = Math.floor(pos);
      const hi = Math.ceil(pos);
      result.push(lo === hi ? colors[lo] : lerpHex(colors[lo], colors[hi], pos - lo));
    }
    return result;
  }

  function lerpHex(a, b, t) {
    const ca = hexToRgb(a), cb = hexToRgb(b);
    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const bch = Math.round(ca.b + (cb.b - ca.b) * t);
    return `rgb(${r},${g},${bch})`;
  }

  function hexToRgb(hex) {
    const v = parseInt(hex.slice(1), 16);
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
  }

  // pt-BR e en-US discordam dos dois separadores, então um número na
  // convenção errada não é só estranho: "1.234" é mil para um público e
  // 1,234 para o outro.
  function numLocale() {
    return state.lang === "en" ? "en-US" : "pt-BR";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function fmtNumber(x) {
    if (x === null || x === undefined || Number.isNaN(x)) return "";
    return Number(x).toLocaleString(numLocale(), { maximumFractionDigits: 2 });
  }
})();
