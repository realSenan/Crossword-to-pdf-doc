// DOM hazır olunca init et
document.addEventListener("DOMContentLoaded", () => {
  // Wiris entegrasyon özellikleri
  var genericIntegrationProperties = {};
  genericIntegrationProperties.target = document.getElementById("editor");
  genericIntegrationProperties.toolbar = document.getElementById("toolbar");

  var mathTypeParameters = {
    editorParameters: {
      language: "en",
      handwriting: true,
    },
  };
  genericIntegrationProperties.integrationParameters = mathTypeParameters;

  var genericIntegrationInstance = new WirisPlugin.GenericIntegration(
    genericIntegrationProperties
  );
  genericIntegrationInstance.init();
  genericIntegrationInstance.listeners.fire("onTargetReady", {});
  WirisPlugin.currentInstance = genericIntegrationInstance;

  const edIcon = document.getElementById("editorIcon");
  document.getElementById("insert-equation").addEventListener("click", () => {
    edIcon.click();
  });

  const editor = document.getElementById("editor");

  // --- LocalStorage'dan yükle ---
  if (localStorage.getItem("editorContent")) {
    editor.innerHTML = localStorage.getItem("editorContent");
  }

  document.getElementById("get-content").addEventListener("click", () => {
    let htmlData = editor.innerHTML;
    htmlData = normalizeEditorContent(htmlData);

    htmlData = htmlData
      .replace(/<br\s*\/?>/gi, "")
      .replace(/<p[^>]*><\/p>/gi, "")
      .replace(/<div[^>]*><\/div>/gi, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s{2,}/g, " ");

    const cleaned = htmlData.replace(/\s+/g, "").replace(/<[^>]*>/g, "");
    const hasText = cleaned.length > 0;
    const hasImage = /<img[^>]*>/i.test(htmlData);
    if (!hasText && !hasImage) return;

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlData;
    tempDiv.querySelectorAll("img").forEach((img) => {
      if (img.src.endsWith(".png") || img.src.endsWith(".jpg")) {
        img.src = img.src.replace(/\.png|\.jpg/gi, ".svg");
      }
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.display = "inline-block";
    });
    tempDiv.querySelectorAll("math").forEach((m) => {
      m.style.width = "100%";
      m.style.height = "auto";
      m.style.transformOrigin = "top left";
    });
    htmlData = tempDiv.innerHTML;

    document.getElementById(
      "output"
    ).innerHTML = `<strong>Pdf İçeriği (MathML):</strong><br>
      <div id="output_content-s"><div class="content-wrapper">${htmlData}</div></div>`;

    applyMarginBottom();

    // --- LocalStorage'a kaydet ---
    localStorage.setItem("editorContent", htmlData);
  });

  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key === "=") {
      WirisPlugin.currentInstance.core.editor.open();
    }
  });

  // Drag & Drop
  editor.addEventListener("dragstart", (e) => {
    if (e.target.tagName === "IMG" && e.target.getAttribute("data-mathml")) {
      e.dataTransfer.setData("text/html", e.target.outerHTML);
    }
  });
  editor.addEventListener("drop", (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/html");
    if (data) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        range.insertNode(
          new DOMParser().parseFromString(data, "text/html").body.firstChild
        );
      }
    }
  });

  // Auto-correct
  editor.addEventListener("input", (e) => {
    localStorage.setItem("editorContent", editor.innerHTML);
  });

  // Placeholder focus/blur
  editor.addEventListener("focus", () => {
    if (editor.innerHTML.trim() === "") editor.innerHTML = "";
  });
  editor.addEventListener("blur", () => {
    if (editor.innerHTML.trim() === "") editor.innerHTML = "";
  });

  const mbSelect = document.getElementById("mb-select");
  mbSelect.addEventListener("change", applyMarginBottom);

  function applyMarginBottom() {
    const outputContent = document.getElementById("output_content-s");
    if (!outputContent) return;
    const mbValue = mbSelect.value + "px";
    const children = outputContent.querySelectorAll("div, p, span, img");
    children.forEach((child) => {
      child.style.marginBottom = mbValue;
    });
  }

  function normalizeEditorContent(html) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    const normalizedChildren = [];
    let currentDiv = null;

    tempDiv.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
        if (!currentDiv) currentDiv = document.createElement("div");
        currentDiv.appendChild(node.cloneNode(true));
      } else if (node.tagName === "IMG" || node.tagName === "SPAN") {
        if (!currentDiv) currentDiv = document.createElement("div");
        currentDiv.appendChild(node.cloneNode(true));
      } else if (node.tagName === "BR") {
        if (!currentDiv) currentDiv = document.createElement("div");
      } else if (node.tagName === "DIV") {
        if (currentDiv) normalizedChildren.push(currentDiv);
        currentDiv = null;
        const clonedDiv = node.cloneNode(true);
        if (clonedDiv.innerHTML.trim() !== "")
          normalizedChildren.push(clonedDiv);
      } else {
        if (currentDiv) normalizedChildren.push(currentDiv);
        currentDiv = null;
        normalizedChildren.push(node.cloneNode(true));
      }
    });

    if (currentDiv) normalizedChildren.push(currentDiv);
    return normalizedChildren.map((child) => child.outerHTML).join("");
  }
});
