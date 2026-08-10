(() => {
  const STORAGE_KEY = "armatus-routine-v2";

  let state = loadState();
  let openIndex = 0;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("armatus-routine-v1");
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return structuredClone(window.DEFAULT_ROUTINE);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Storage full — compressing images…", err);
      compactImages().then(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (_) {
          alert("El navegador no pudo guardar todas las imágenes (almacenamiento lleno). El PDF igual funcionará en esta sesión.");
        }
      });
    }
  }

  async function compactImages() {
    const imgApi = window.ArmatusImages;
    if (!imgApi) return;
    for (const ex of state.exercises) {
      if (ex.image?.startsWith("data:image/png")) {
        try {
          const im = await imgApi.loadImage(ex.image, false);
          ex.image = await imgApi.toJpegDataUrl(im, 960, 0.8);
        } catch (_) {}
      }
      for (const p of ex.parts || []) {
        if (p.image?.startsWith("data:image/png")) {
          try {
            const im = await imgApi.loadImage(p.image, false);
            p.image = await imgApi.toJpegDataUrl(im, 960, 0.8);
          } catch (_) {}
        }
      }
    }
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function linesToList(text) {
    return String(text || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter(Boolean);
  }

  function listToLines(arr) {
    return (arr || []).join("\n");
  }

  function padNum(n) {
    return String(n).padStart(2, "0");
  }

  function thumbHtml(src) {
    if (!src) return `<div class="img-thumb img-thumb--empty">Sin boceto</div>`;
    return `<div class="img-thumb"><img src="${escapeHtml(src)}" alt="Boceto" /></div>`;
  }

  function imageControls(opts) {
    const { i, pi, src, label } = opts;
    const isPart = pi != null;
    const genAttr = isPart ? `data-gen-part="${i}" data-pi="${pi}"` : `data-gen="${i}"`;
    const fileAttr = isPart ? `data-file-part="${i}" data-pi="${pi}"` : `data-file="${i}"`;
    const clearAttr = isPart ? `data-clear-part="${i}" data-pi="${pi}"` : `data-clear-img="${i}"`;
    const inputAttr = isPart
      ? `data-pk="image" data-i="${i}" data-pi="${pi}"`
      : `data-k="image" data-i="${i}"`;
    return `
      <div class="img-tools field--full">
        <span class="img-tools__label">${escapeHtml(label || "Boceto")}</span>
        ${thumbHtml(src)}
        <div class="img-tools__actions">
          <button type="button" class="btn btn--primary btn--sm" ${genAttr}>Generar boceto</button>
          <label class="btn btn--ghost btn--sm file-btn">Subir
            <input type="file" accept="image/*" hidden ${fileAttr} />
          </label>
          <button type="button" class="btn btn--ghost btn--sm" ${clearAttr}>Quitar</button>
        </div>
        <label class="field" style="margin-top:8px">
          <span>URL / ruta (opcional)</span>
          <input ${inputAttr} value="${escapeHtml(src || "")}" placeholder="images/... o data URL" />
        </label>
      </div>`;
  }

  function readMetaFromForm() {
    state.eyebrow = $("#f-eyebrow").value.trim();
    state.client = $("#f-client").value.trim();
    state.title = $("#f-title").value.trim();
    state.titleAccent = $("#f-accent").value.trim();
    state.titleSuffix = $("#f-suffix").value.trim();
    state.featuring = $("#f-featuring").value.trim();
    state.lead = $("#f-lead").value.trim();
    state.metaBlocks = $("#f-blocks").value.trim();
    state.metaMinutes = $("#f-minutes").value.trim();
    state.metaFrequency = $("#f-freq").value.trim();
  }

  function fillMetaForm() {
    $("#f-eyebrow").value = state.eyebrow || "";
    $("#f-client").value = state.client || "";
    $("#f-title").value = state.title || "";
    $("#f-accent").value = state.titleAccent || "";
    $("#f-suffix").value = state.titleSuffix || "";
    $("#f-featuring").value = state.featuring || "";
    $("#f-lead").value = state.lead || "";
    $("#f-blocks").value = state.metaBlocks || "";
    $("#f-minutes").value = state.metaMinutes || "";
    $("#f-freq").value = state.metaFrequency || "";
  }

  function renderEditor() {
    const root = $("#exercises-editor");
    root.innerHTML = state.exercises
      .map((ex, i) => {
        return `
        <details class="ex-edit" data-i="${i}" ${i === openIndex ? "open" : ""}>
          <summary>
            <span class="ex-edit__num">${padNum(i + 1)}</span>
            <span class="ex-edit__name">${escapeHtml(ex.title || "Ejercicio")}</span>
            <button type="button" class="ex-edit__delete" data-delete="${i}" title="Eliminar">✕</button>
          </summary>
          <div class="ex-edit__body">
            <div class="form-grid">
              <label class="field"><span>Nombre corto (nav)</span><input data-k="shortLabel" data-i="${i}" value="${escapeHtml(ex.shortLabel)}" /></label>
              <label class="field"><span>Tag</span><input data-k="tag" data-i="${i}" value="${escapeHtml(ex.tag)}" /></label>
              <label class="field field--full"><span>Badge</span><input data-k="badge" data-i="${i}" value="${escapeHtml(ex.badge)}" /></label>
              <label class="field"><span>Título</span><input data-k="title" data-i="${i}" value="${escapeHtml(ex.title)}" /></label>
              <label class="field"><span>Subtítulo / EM</span><input data-k="titleEm" data-i="${i}" value="${escapeHtml(ex.titleEm)}" /></label>
              <label class="field"><span>Dosis</span><input data-k="doseValue" data-i="${i}" value="${escapeHtml(ex.doseValue)}" /></label>
              <label class="field"><span>Meta dosis</span><input data-k="doseMeta" data-i="${i}" value="${escapeHtml(ex.doseMeta)}" /></label>
              <label class="field field--full"><span>Intro</span><textarea data-k="intro" data-i="${i}" rows="2">${escapeHtml(ex.intro)}</textarea></label>
              <label class="field field--full"><span>Propósito</span><textarea data-k="purpose" data-i="${i}" rows="2">${escapeHtml(ex.purpose)}</textarea></label>
              <label class="field field--full"><span>Bullets (uno por línea)</span><textarea data-k="bullets" data-i="${i}" rows="3">${escapeHtml(listToLines(ex.bullets))}</textarea></label>
              <label class="field field--full"><span>Agonistas (separados por coma)</span><input data-k="agonists" data-i="${i}" value="${escapeHtml(ex.agonists)}" /></label>
              <label class="field field--full"><span>Sinergistas (separados por coma)</span><input data-k="synergists" data-i="${i}" value="${escapeHtml(ex.synergists)}" /></label>
              <label class="field field--full"><span>Pasos (uno por línea · usa — para título)</span><textarea data-k="steps" data-i="${i}" rows="4">${escapeHtml(listToLines(ex.steps))}</textarea></label>
              <label class="field field--full"><span>Errores (uno por línea)</span><textarea data-k="mistakes" data-i="${i}" rows="3">${escapeHtml(listToLines(ex.mistakes))}</textarea></label>
              <label class="field field--full"><span>Beneficio</span><textarea data-k="benefit" data-i="${i}" rows="2">${escapeHtml(ex.benefit)}</textarea></label>
              ${imageControls({ i, src: ex.image, label: "Boceto del ejercicio" })}
            </div>
            <div class="parts-block">
              <div class="parts-block__head">
                <strong>Sub-partes (opcional)</strong>
                <button type="button" class="btn btn--ghost btn--sm" data-add-part="${i}">+ Parte</button>
              </div>
              ${(ex.parts || [])
                .map(
                  (p, pi) => `
                <div class="part-edit" data-i="${i}" data-pi="${pi}">
                  <div class="form-grid">
                    <label class="field"><span>Código</span><input data-pk="code" data-i="${i}" data-pi="${pi}" value="${escapeHtml(p.code)}" /></label>
                    <label class="field"><span>Pill</span><input data-pk="pill" data-i="${i}" data-pi="${pi}" value="${escapeHtml(p.pill)}" /></label>
                    <label class="field field--full"><span>Título</span><input data-pk="title" data-i="${i}" data-pi="${pi}" value="${escapeHtml(p.title)}" /></label>
                    <label class="field field--full"><span>Texto</span><textarea data-pk="text" data-i="${i}" data-pi="${pi}" rows="2">${escapeHtml(p.text)}</textarea></label>
                    <label class="field field--full"><span>Músculos</span><input data-pk="muscles" data-i="${i}" data-pi="${pi}" value="${escapeHtml(p.muscles)}" /></label>
                    <label class="field field--full"><span>Pasos</span><textarea data-pk="steps" data-i="${i}" data-pi="${pi}" rows="3">${escapeHtml(listToLines(p.steps))}</textarea></label>
                    ${imageControls({ i, pi, src: p.image, label: `Boceto · ${p.code || "parte"}` })}
                  </div>
                  <button type="button" class="linkish" data-del-part="${i}" data-pi="${pi}">Eliminar parte</button>
                </div>`
                )
                .join("")}
            </div>
            <div class="ex-edit__move">
              <button type="button" class="chip-btn" data-up="${i}" ${i === 0 ? "disabled" : ""}>↑ Subir</button>
              <button type="button" class="chip-btn" data-down="${i}" ${i === state.exercises.length - 1 ? "disabled" : ""}>↓ Bajar</button>
            </div>
          </div>
        </details>`;
      })
      .join("");
  }

  async function setBusy(btn, busy, label = "Generar boceto") {
    if (!btn) return;
    btn.disabled = busy;
    btn.textContent = busy ? "Generando…" : label;
  }

  async function generateForExercise(i, btn) {
    const ex = state.exercises[i];
    const extra = [ex.titleEm, ex.intro, ex.steps?.[0]].filter(Boolean).join(". ");
    await setBusy(btn, true);
    try {
      const dataUrl = await window.ArmatusImages.generateSketch(ex.title || "exercise", extra);
      ex.image = dataUrl;
      openIndex = i;
      refreshAll();
    } catch (err) {
      console.error(err);
      alert("No se pudo generar el boceto. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      await setBusy(btn, false);
    }
  }

  async function generateForPart(i, pi, btn) {
    const p = state.exercises[i].parts[pi];
    const extra = [p.text, p.steps?.[0]].filter(Boolean).join(". ");
    await setBusy(btn, true);
    try {
      const dataUrl = await window.ArmatusImages.generateSketch(p.title || "exercise part", extra);
      p.image = dataUrl;
      openIndex = i;
      refreshAll();
    } catch (err) {
      console.error(err);
      alert("No se pudo generar el boceto. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      await setBusy(btn, false);
    }
  }

  function bindEditorEvents() {
    const root = $("#exercises-editor");

    root.addEventListener("toggle", (e) => {
      const d = e.target.closest("details.ex-edit");
      if (d?.open) openIndex = Number(d.dataset.i);
    });

    root.addEventListener("input", (e) => {
      const t = e.target;
      if (t.dataset.k != null) {
        const i = Number(t.dataset.i);
        const k = t.dataset.k;
        if (["bullets", "steps", "mistakes"].includes(k)) state.exercises[i][k] = linesToList(t.value);
        else state.exercises[i][k] = t.value;
        if (k === "title") {
          const summaryName = t.closest("details")?.querySelector(".ex-edit__name");
          if (summaryName) summaryName.textContent = t.value || "Ejercicio";
        }
        debouncePreview();
        return;
      }
      if (t.dataset.pk != null) {
        const i = Number(t.dataset.i);
        const pi = Number(t.dataset.pi);
        const k = t.dataset.pk;
        if (k === "steps") state.exercises[i].parts[pi].steps = linesToList(t.value);
        else state.exercises[i].parts[pi][k] = t.value;
        debouncePreview();
      }
    });

    root.addEventListener("click", async (e) => {
      const gen = e.target.closest("[data-gen]");
      if (gen) {
        e.preventDefault();
        await generateForExercise(Number(gen.dataset.gen), gen);
        return;
      }
      const genPart = e.target.closest("[data-gen-part]");
      if (genPart) {
        e.preventDefault();
        await generateForPart(Number(genPart.dataset.genPart), Number(genPart.dataset.pi), genPart);
        return;
      }
      const clear = e.target.closest("[data-clear-img]");
      if (clear) {
        e.preventDefault();
        state.exercises[Number(clear.dataset.clearImg)].image = "";
        openIndex = Number(clear.dataset.clearImg);
        refreshAll();
        return;
      }
      const clearPart = e.target.closest("[data-clear-part]");
      if (clearPart) {
        e.preventDefault();
        state.exercises[Number(clearPart.dataset.clearPart)].parts[Number(clearPart.dataset.pi)].image = "";
        openIndex = Number(clearPart.dataset.clearPart);
        refreshAll();
        return;
      }
      const del = e.target.closest("[data-delete]");
      if (del) {
        e.preventDefault();
        const i = Number(del.dataset.delete);
        if (confirm("¿Eliminar este ejercicio?")) {
          state.exercises.splice(i, 1);
          openIndex = Math.max(0, i - 1);
          refreshAll();
        }
        return;
      }
      const up = e.target.closest("[data-up]");
      if (up) {
        const i = Number(up.dataset.up);
        if (i > 0) {
          [state.exercises[i - 1], state.exercises[i]] = [state.exercises[i], state.exercises[i - 1]];
          openIndex = i - 1;
          refreshAll();
        }
        return;
      }
      const down = e.target.closest("[data-down]");
      if (down) {
        const i = Number(down.dataset.down);
        if (i < state.exercises.length - 1) {
          [state.exercises[i + 1], state.exercises[i]] = [state.exercises[i], state.exercises[i + 1]];
          openIndex = i + 1;
          refreshAll();
        }
        return;
      }
      const addPart = e.target.closest("[data-add-part]");
      if (addPart) {
        const i = Number(addPart.dataset.addPart);
        state.exercises[i].parts = state.exercises[i].parts || [];
        state.exercises[i].parts.push({
          code: `${i + 1}${String.fromCharCode(65 + state.exercises[i].parts.length)}`,
          title: "Nueva parte",
          pill: "",
          text: "",
          muscles: "",
          steps: [""],
          image: "",
        });
        openIndex = i;
        refreshAll();
        return;
      }
      const delPart = e.target.closest("[data-del-part]");
      if (delPart) {
        const i = Number(delPart.dataset.delPart);
        state.exercises[i].parts.splice(Number(delPart.dataset.pi), 1);
        openIndex = i;
        refreshAll();
      }
    });

    root.addEventListener("change", async (e) => {
      const fileEx = e.target.closest("input[data-file]");
      if (fileEx?.files?.[0]) {
        const i = Number(fileEx.dataset.file);
        try {
          state.exercises[i].image = await window.ArmatusImages.fileToDataUrl(fileEx.files[0]);
          openIndex = i;
          refreshAll();
        } catch (_) {
          alert("No se pudo leer la imagen.");
        }
        return;
      }
      const filePart = e.target.closest("input[data-file-part]");
      if (filePart?.files?.[0]) {
        const i = Number(filePart.dataset.filePart);
        const pi = Number(filePart.dataset.pi);
        try {
          state.exercises[i].parts[pi].image = await window.ArmatusImages.fileToDataUrl(filePart.files[0]);
          openIndex = i;
          refreshAll();
        } catch (_) {
          alert("No se pudo leer la imagen.");
        }
      }
    });
  }

  function tagsHtml(str, muted = false) {
    return String(str || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `<span class="tag${muted ? " tag--muted" : ""}">${escapeHtml(s)}</span>`)
      .join("");
  }

  function renderExercise(ex, index) {
    const n = padNum(index + 1);
    const sketch = ex.image
      ? `<figure class="sketch"><img src="${escapeHtml(ex.image)}" alt="Boceto: ${escapeHtml(ex.title)}" loading="eager" crossorigin="anonymous" /><figcaption class="sketch__caption">Boceto · Técnica</figcaption></figure>`
      : "";

    const purposeBlock =
      ex.purpose || (ex.bullets && ex.bullets.length)
        ? `<div class="block">
            <h3 class="block__title"><span class="block__icon">⚡</span> Propósito y enfoque</h3>
            ${ex.purpose ? `<p>${escapeHtml(ex.purpose)}</p>` : ""}
            ${
              ex.bullets?.length
                ? `<ul class="check-list">${ex.bullets.map((b) => `<li><span>${escapeHtml(b)}</span></li>`).join("")}</ul>`
                : ""
            }
          </div>`
        : "";

    const muscleBlock =
      ex.agonists || ex.synergists
        ? `<div class="block">
            <h3 class="block__title"><span class="block__icon">◎</span> Enfoque muscular</h3>
            ${ex.agonists ? `<span class="section-label">Agonistas</span><div class="tag-row">${tagsHtml(ex.agonists)}</div>` : ""}
            ${ex.synergists ? `<span class="section-label" style="margin-top:14px">Sinergistas</span><div class="tag-row">${tagsHtml(ex.synergists, true)}</div>` : ""}
          </div>`
        : "";

    const stepsBlock =
      ex.steps?.length && ex.steps.some(Boolean)
        ? `<div class="block" style="margin-top:14px">
            <h3 class="block__title"><span class="block__icon">→</span> Cómo ejecutarlo</h3>
            <div class="steps">${ex.steps
              .filter(Boolean)
              .map((s, si) => {
                const parts = String(s).split("—");
                const title = parts.length > 1 ? parts[0].trim() : `Paso ${si + 1}`;
                const body = parts.length > 1 ? parts.slice(1).join("—").trim() : s;
                return `<div class="step"><span class="step__n">${padNum(si + 1)} · ${escapeHtml(title)}</span><p>${escapeHtml(body)}</p></div>`;
              })
              .join("")}</div>
          </div>`
        : "";

    const partsHtml = (ex.parts || [])
      .map(
        (p) => `
      <div class="subcard">
        <div class="subcard__head">
          <div class="subcard__title"><span class="subcard__code">${escapeHtml(p.code)}</span>${escapeHtml(p.title)}</div>
          ${p.pill ? `<span class="pill">${escapeHtml(p.pill)}</span>` : ""}
        </div>
        ${
          p.image
            ? `<figure class="sketch sketch--compact"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" loading="eager" crossorigin="anonymous" /><figcaption class="sketch__caption">Boceto · Técnica</figcaption></figure>`
            : ""
        }
        ${p.text ? `<p style="color:var(--text-secondary);font-size:0.9rem">${escapeHtml(p.text)}</p>` : ""}
        ${p.muscles ? `<p class="muscles"><strong>Músculos clave:</strong> ${escapeHtml(p.muscles)}</p>` : ""}
        ${
          p.steps?.filter(Boolean).length
            ? `<ol>${p.steps.filter(Boolean).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`
            : ""
        }
      </div>`
      )
      .join("");

    const split =
      (ex.mistakes?.length && ex.mistakes.some(Boolean)) || ex.benefit
        ? `<div class="split">
            ${
              ex.mistakes?.filter(Boolean).length
                ? `<div class="warn"><h4>Errores comunes</h4><ul>${ex.mistakes
                    .filter(Boolean)
                    .map((m) => `<li>${escapeHtml(m)}</li>`)
                    .join("")}</ul></div>`
                : ""
            }
            ${ex.benefit ? `<div class="benefit"><h4>Beneficio</h4><p>${escapeHtml(ex.benefit)}</p></div>` : ""}
          </div>`
        : "";

    return `
      <article id="${escapeHtml(ex.id)}" class="panel exercise pdf-break" data-exercise="${escapeHtml(ex.id)}">
        <div class="exercise__head">
          <div>
            <div class="exercise__badge">${escapeHtml(ex.badge || `${n} · Bloque`)}</div>
            <h2 class="exercise__title">${escapeHtml(ex.title)} ${ex.titleEm ? `<em>${escapeHtml(ex.titleEm)}</em>` : ""}</h2>
            ${ex.intro ? `<p class="exercise__intro">${escapeHtml(ex.intro)}</p>` : ""}
          </div>
          <div class="dose">
            <span class="dose__label">Dosificación</span>
            <span class="dose__value">${escapeHtml(ex.doseValue)}</span>
            <span class="dose__meta">${escapeHtml(ex.doseMeta)}</span>
          </div>
        </div>
        ${sketch}
        ${purposeBlock || muscleBlock ? `<div class="grid-2">${purposeBlock}${muscleBlock}</div>` : ""}
        ${stepsBlock}
        ${partsHtml}
        ${split}
      </article>`;
  }

  function renderPreview() {
    const root = $("#preview-root");
    const firstId = state.exercises[0]?.id || "top";
    const clientLine = state.client
      ? `<p class="hero__client">Para <strong>${escapeHtml(state.client)}</strong></p>`
      : "";

    root.innerHTML = `
      <div class="routine-sheet" id="routine-sheet">
        <section class="hero hero--sheet">
          <div class="hero__grid">
            <div class="hero__eyebrow">${escapeHtml(state.eyebrow || "Protocolo")}</div>
            <h1 class="hero__title">${escapeHtml(state.title)} <span>${escapeHtml(state.titleAccent)}</span> ${escapeHtml(state.titleSuffix)}</h1>
            ${
              state.featuring
                ? `<p class="hero__featuring"><span class="hero__featuring-label">ft.</span><span class="hero__featuring-name">${escapeHtml(state.featuring)}</span></p>`
                : ""
            }
            ${clientLine}
            ${state.lead ? `<p class="hero__lead">${escapeHtml(state.lead)}</p>` : ""}
            <div class="hero__actions no-print">
              <a class="btn btn--primary" href="#${escapeHtml(firstId)}">Empezar rutina</a>
            </div>
            <div class="hero__meta">
              <div class="meta-chip"><strong>${escapeHtml(state.metaBlocks || String(state.exercises.length))}</strong><span>Bloques</span></div>
              <div class="meta-chip"><strong>${escapeHtml(state.metaMinutes || "—")}</strong><span>Minutos</span></div>
              <div class="meta-chip"><strong>${escapeHtml(state.metaFrequency || "—")}</strong><span>Por semana</span></div>
            </div>
          </div>
        </section>

        <nav class="ex-nav-wrap no-print" aria-label="Ejercicios">
          <div class="ex-nav">
            ${state.exercises
              .map(
                (ex, i) => `
              <a class="ex-nav__btn ${i === 0 ? "is-active" : ""}" href="#${escapeHtml(ex.id)}" data-nav="${escapeHtml(ex.id)}">
                <span class="ex-nav__num">${padNum(i + 1)}</span>
                <span class="ex-nav__label">${escapeHtml(ex.shortLabel || ex.title)}</span>
                <span class="ex-nav__tag">${escapeHtml(ex.tag || "")}</span>
              </a>`
              )
              .join("")}
          </div>
        </nav>

        <main class="main main--sheet">
          ${state.exercises.map((ex, i) => renderExercise(ex, i)).join("")}
          <section class="panel tracker pdf-break" style="padding:20px">
            <div class="tracker__head">
              <div>
                <h3>Registro de sesión</h3>
                <p>Marca cada bloque cuando lo completes.</p>
              </div>
            </div>
            <div class="tracker__grid">
              ${state.exercises
                .map(
                  (ex, i) => `
                <label class="check"><input type="checkbox" /><span>${padNum(i + 1)} · ${escapeHtml(ex.shortLabel || ex.title)}</span></label>`
                )
                .join("")}
            </div>
          </section>
        </main>

        <footer class="footer">
          <p><strong>ARMATUS</strong> · Protocolo de fuerza
          ${state.featuring ? ` · <span class="footer__ft">ft. ${escapeHtml(state.featuring)}</span>` : ""}
          ${state.client ? ` · Para ${escapeHtml(state.client)}` : ""}</p>
        </footer>
      </div>`;

    wirePreviewExtras();
  }

  function wirePreviewExtras() {
    const navButtons = $$("[data-nav]", $("#preview-root"));
    const sections = $$("[data-exercise]", $("#preview-root"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute("data-exercise");
          navButtons.forEach((btn) => btn.classList.toggle("is-active", btn.getAttribute("data-nav") === id));
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0.01 }
    );
    sections.forEach((s) => observer.observe(s));
  }

  function parsePrompt(text) {
    const chunks = text.split(/\n---+\n/);
    const header = chunks[0] || "";
    const get = (key) => {
      const re = new RegExp(`^${key}\\s*:\\s*(.+)$`, "im");
      const m = header.match(re);
      return m ? m[1].trim() : "";
    };

    const next = structuredClone(window.DEFAULT_ROUTINE);
    next.exercises = [];
    const titleLine = get("TÍTULO") || get("TITULO");
    if (titleLine) {
      next.title = titleLine;
      next.titleAccent = get("ACENTO") || "";
      next.titleSuffix = get("SUFIJO") || "";
    }
    if (get("FT")) next.featuring = get("FT");
    if (get("CLIENTE")) next.client = get("CLIENTE");
    if (get("DESCRIPCIÓN") || get("DESCRIPCION")) next.lead = get("DESCRIPCIÓN") || get("DESCRIPCION");
    if (get("EYEBROW")) next.eyebrow = get("EYEBROW");
    const meta = get("META");
    if (meta) {
      const parts = meta.split("|").map((p) => p.trim());
      if (parts[0]) next.metaBlocks = parts[0];
      if (parts[1]) next.metaMinutes = parts[1];
      if (parts[2]) next.metaFrequency = parts[2];
    }

    const bodyChunks = chunks.slice(1).length ? chunks.slice(1) : chunks[0].includes("NOMBRE:") ? [chunks[0]] : [];

    bodyChunks.forEach((chunk, idx) => {
      if (!/NOMBRE\s*:/i.test(chunk) && !/EJERCICIO\s*:/i.test(chunk)) return;
      const g = (key) => {
        const re = new RegExp(`^${key}\\s*:\\s*(.+)$`, "im");
        const m = chunk.match(re);
        return m ? m[1].trim() : "";
      };
      const block = (key) => {
        const re = new RegExp(`^${key}\\s*:\\s*([\\s\\S]*?)(?=\\n[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\\s]*:|$)`, "im");
        const m = chunk.match(re);
        return m ? m[1].trim() : "";
      };

      const name = g("NOMBRE") || g("EJERCICIO");
      const doseRaw = g("DOSIS");
      const [doseValue, doseMeta] = doseRaw.includes("|")
        ? doseRaw.split("|").map((s) => s.trim())
        : [doseRaw, ""];

      const ex = window.EMPTY_EXERCISE();
      ex.id = `ex-${idx + 1}`;
      ex.title = name || `Ejercicio ${idx + 1}`;
      ex.shortLabel = name?.split(" ")[0] || `Ex ${idx + 1}`;
      ex.titleEm = g("EM");
      ex.tag = g("TAG") || "Fuerza";
      ex.badge = g("BADGE") || `${padNum(idx + 1)} · Bloque`;
      ex.intro = block("INTRO") || g("INTRO");
      ex.purpose = block("PROPÓSITO") || block("PROPOSITO") || g("PROPÓSITO") || g("PROPOSITO");
      ex.doseValue = doseValue || "3 × 8–10";
      ex.doseMeta = doseMeta || "Descanso 90 s";
      ex.benefit = block("BENEFICIO") || g("BENEFICIO");
      ex.agonists = g("AGONISTAS");
      ex.synergists = g("SINERGISTAS");
      ex.steps = linesToList(block("PASOS"));
      ex.mistakes = linesToList(block("ERRORES"));
      ex.bullets = linesToList(block("BULLETS"));
      ex.image = g("IMAGEN");
      next.exercises.push(ex);
    });

    if (!next.exercises.length) {
      alert("No encontré ejercicios. Usa bloques separados por --- con NOMBRE: ...");
      return null;
    }
    next.metaBlocks = next.metaBlocks || String(next.exercises.length);
    return next;
  }

  function waitForImages(root) {
    const imgs = [...root.querySelectorAll("img")];
    return Promise.all(
      imgs.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete && img.naturalWidth) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 8000);
          })
      )
    );
  }

  async function embedAllImagesInState() {
    const api = window.ArmatusImages;
    for (const ex of state.exercises) {
      if (ex.image && !ex.image.startsWith("data:")) {
        ex.image = await api.ensureEmbeddable(ex.image);
      }
      for (const p of ex.parts || []) {
        if (p.image && !p.image.startsWith("data:")) {
          p.image = await api.ensureEmbeddable(p.image);
        }
      }
    }
  }

  async function downloadPdf() {
    const btn = $("#btn-pdf");
    const btn2 = $("#btn-pdf-2");
    const label = btn?.textContent;
    if (btn) btn.textContent = "Preparando…";
    if (btn2) btn2.textContent = "Preparando…";

    const filename = `ARMATUS_${(state.client || state.titleAccent || "rutina")
      .replace(/\s+/g, "_")
      .slice(0, 40)}.pdf`;

    try {
      // Embed local/path images as data URLs so html2canvas never drops them
      if (btn) btn.textContent = "Incrustando imágenes…";
      if (btn2) btn2.textContent = "Incrustando imágenes…";
      await embedAllImagesInState();
      renderPreview();
      saveState();

      const sheet = $("#routine-sheet");
      if (!sheet) throw new Error("No hay vista previa");

      // Off-screen export clone at fixed desktop width = same format as web layout
      const host = document.createElement("div");
      host.id = "pdf-export-host";
      host.className = "pdf-export-host";
      const clone = sheet.cloneNode(true);
      clone.id = "pdf-export-sheet";
      clone.classList.add("pdf-export-sheet");
      // Remove interactive-only bits
      clone.querySelectorAll(".no-print").forEach((el) => el.remove());
      host.appendChild(clone);
      document.body.appendChild(host);

      if (btn) btn.textContent = "Cargando bocetos…";
      if (btn2) btn2.textContent = "Cargando bocetos…";
      await waitForImages(clone);
      await new Promise((r) => setTimeout(r, 300));

      if (btn) btn.textContent = "Generando PDF…";
      if (btn2) btn2.textContent = "Generando PDF…";

      if (!window.html2pdf) {
        window.print();
        return;
      }

      const opt = {
        margin: [10, 10, 12, 10],
        filename,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#000000",
          logging: false,
          imageTimeout: 15000,
          windowWidth: 900,
          onclone: (doc) => {
            const el = doc.getElementById("pdf-export-sheet");
            if (el) {
              el.style.width = "880px";
              el.style.maxWidth = "880px";
              el.querySelectorAll("img").forEach((img) => {
                img.style.objectFit = "contain";
                img.style.width = "100%";
                img.style.height = "auto";
                img.style.maxHeight = "none";
              });
            }
          },
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: [".pdf-break", ".sketch", ".subcard", ".block"] },
      };

      await window.html2pdf().set(opt).from(clone).save();
      host.remove();
    } catch (err) {
      console.error(err);
      document.getElementById("pdf-export-host")?.remove();
      alert("Hubo un problema generando el PDF. Se abrirá la impresión del navegador (elige 'Guardar como PDF').");
      window.print();
    } finally {
      if (btn) btn.textContent = label || "Descargar PDF";
      if (btn2) btn2.textContent = "Descargar PDF";
    }
  }

  let previewTimer = null;
  function debouncePreview() {
    readMetaFromForm();
    saveState();
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 180);
  }

  function refreshAll() {
    fillMetaForm();
    renderEditor();
    renderPreview();
    saveState();
  }

  function init() {
    fillMetaForm();
    renderEditor();
    bindEditorEvents();
    renderPreview();

    ["f-eyebrow", "f-client", "f-title", "f-accent", "f-suffix", "f-featuring", "f-lead", "f-blocks", "f-minutes", "f-freq"].forEach(
      (id) => $(`#${id}`)?.addEventListener("input", debouncePreview)
    );

    $("#btn-add-ex")?.addEventListener("click", () => {
      const ex = window.EMPTY_EXERCISE();
      ex.badge = `${padNum(state.exercises.length + 1)} · Bloque`;
      state.exercises.push(ex);
      state.metaBlocks = String(state.exercises.length);
      openIndex = state.exercises.length - 1;
      refreshAll();
      $$(".ex-edit").at(-1)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    $("#btn-load-template")?.addEventListener("click", () => {
      if (confirm("¿Cargar la plantilla de piernas (Lalo) y reemplazar lo actual?")) {
        state = structuredClone(window.DEFAULT_ROUTINE);
        openIndex = 0;
        refreshAll();
      }
    });

    $("#btn-new")?.addEventListener("click", () => {
      if (confirm("¿Empezar rutina vacía?")) {
        state = {
          eyebrow: "Protocolo personalizado",
          title: "Rutina de",
          titleAccent: "fuerza",
          titleSuffix: "",
          featuring: "Silvia Adriana Gonzalez",
          client: "",
          lead: "",
          metaBlocks: "0",
          metaMinutes: "~40",
          metaFrequency: "2×",
          exercises: [],
        };
        openIndex = 0;
        refreshAll();
      }
    });

    $("#btn-parse-prompt")?.addEventListener("click", () => {
      const parsed = parsePrompt($("#f-prompt").value);
      if (!parsed) return;
      state = parsed;
      openIndex = 0;
      refreshAll();
      alert(`Listo: ${state.exercises.length} ejercicio(s) cargados.`);
    });

    $("#btn-gen-all")?.addEventListener("click", async () => {
      const btn = $("#btn-gen-all");
      if (!confirm("¿Generar bocetos para todos los ejercicios que no tienen imagen? Puede tardar unos minutos.")) return;
      btn.disabled = true;
      btn.textContent = "Generando…";
      try {
        for (let i = 0; i < state.exercises.length; i++) {
          const ex = state.exercises[i];
          btn.textContent = `Boceto ${i + 1}/${state.exercises.length}…`;
          if (!ex.image) {
            const extra = [ex.titleEm, ex.intro].filter(Boolean).join(". ");
            ex.image = await window.ArmatusImages.generateSketch(ex.title || "exercise", extra);
          }
          for (let pi = 0; pi < (ex.parts || []).length; pi++) {
            const p = ex.parts[pi];
            if (!p.image) {
              p.image = await window.ArmatusImages.generateSketch(p.title || "part", p.text || "");
            }
          }
          openIndex = i;
          refreshAll();
        }
        alert("Bocetos listos.");
      } catch (err) {
        console.error(err);
        alert("Se interrumpió la generación. Puedes reintentar ejercicio por ejercicio.");
      } finally {
        btn.disabled = false;
        btn.textContent = "Generar bocetos faltantes";
      }
    });

    $("#btn-pdf")?.addEventListener("click", downloadPdf);
    $("#btn-pdf-2")?.addEventListener("click", downloadPdf);
  }

  init();
})();
