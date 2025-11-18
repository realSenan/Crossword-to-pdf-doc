// DOM hazır olunca init et
document.addEventListener("DOMContentLoaded", () => {
  // Wiris entegrasyon özellikleri
  var genericIntegrationProperties = {};
  genericIntegrationProperties.target = document.getElementById("editor");
  genericIntegrationProperties.toolbar = document.getElementById("toolbar");

  // Ek konfigürasyon (dil, handwriting vb.)
  var mathTypeParameters = {
    editorParameters: {
      language: "en", // Veya 'tr' eğer destekliyse
      handwriting: true, // Ink to math (el yazısı tanıma) etkin
    },
  };
  genericIntegrationProperties.integrationParameters = mathTypeParameters;

  // Instance oluştur
  var genericIntegrationInstance = new WirisPlugin.GenericIntegration(
    genericIntegrationProperties
  );
  genericIntegrationInstance.init();
  genericIntegrationInstance.listeners.fire("onTargetReady", {});

  // Current instance set et
  WirisPlugin.currentInstance = genericIntegrationInstance;
  const edIcon = document.getElementById("editorIcon");
  // Denklem ekleme butonu (editorü aç) - Hata düzeltme: core.editor.open() olarak değiştir
  document.getElementById("insert-equation").addEventListener("click", () => {
    // WirisPlugin.currentInstance.core.editor.open();
    edIcon.click();
  });

  // İçeriği al (MathML dahil)
  document.getElementById("get-content").addEventListener("click", () => {
    let htmlData = document.getElementById("editor").innerHTML;

    // Normalize the structure
    htmlData = normalizeEditorContent(htmlData);

    // Boş etiketleri temizle (boş <br>, <p:empty>, boş div'ler)
    htmlData = htmlData
      .replace(/<br\s*\/?>/gi, "") // <br> kaldır
      .replace(/<p[^>]*><\/p>/gi, "") // Boş <p>
      .replace(/<div[^>]*><\/div>/gi, "") // Boş <div>
      .replace(/&nbsp;/gi, " ") // &nbsp; to space
      .replace(/\s{2,}/g, " "); // Fazla boşlukları tek boşluğa indir

    // Boş içerik kontrolü
    const cleaned = htmlData.replace(/\s+/g, "").replace(/<[^>]*>/g, "");

    const hasText = cleaned.length > 0;
    const hasImage = /<img[^>]*>/i.test(htmlData);

    if (!hasText && !hasImage) {
      console.log("Boş içerik, çıktı oluşturulmadı.");
      return;
    }
    // htmlData = WirisPlugin.Parser.endParse(htmlData, { useImages: true });

    // MathML'e dönüştür
    // htmlData = WirisPlugin.Parser.endParse(htmlData);
    // htmlData = document.getElementById("editor").innerHTML;
    // if (htmlData) {
    //   // Tek kapsayıcı div içinde tut
    //   document.getElementById(
    //     "output"
    //   ).innerHTML = `<strong>Editör İçeriği (MathML):</strong><br><div id="output_content-s"><div class="content-wrapper">${htmlData}</div></div>`;
    //   console.log("Exported Content:", htmlData);

    //   // İçeriği aldıktan sonra margin-bottom'u uygula
    //   applyMarginBottom();
    // }

    if (htmlData) {
      // MathML içindeki img’leri optimize et ve SVG’ye çevir
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlData;
      tempDiv.querySelectorAll("img").forEach((img) => {
        // Eğer SVG varsa kullan
        if (img.src.endsWith(".png") || img.src.endsWith(".jpg")) {
          const svgSrc = img.src.replace(/\.png|\.jpg/gi, ".svg");
          img.src = svgSrc;
        }

        img.style.width = "100%";
        img.style.height = "auto";
        img.style.display = "inline-block";
      });
      tempDiv.querySelectorAll("math").forEach((m) => {
        m.style.width = "100%";
        m.style.height = "auto";
        // m.style.transform = "scale(1.15)";
        m.style.transformOrigin = "top left";
      });
      htmlData = tempDiv.innerHTML;

      // Tek kapsayıcı div içinde tut
      document.getElementById(
        "output"
      ).innerHTML = `<strong>Editör İçeriği (MathML):</strong><br>
    <div id="output_content-s"><div class="content-wrapper">${htmlData}</div></div>`;

      console.log("Exported Content:", htmlData);

      // İçeriği aldıktan sonra margin-bottom'u uygula
      applyMarginBottom();
    }
  });

  // Klavye kısayolları (Alt + =)
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key === "=") {
      WirisPlugin.currentInstance.core.editor.open();
    }
  });

  // Sürükle-bırak (temel)
  const editor = document.getElementById("editor");
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

  // Auto-correct simülasyon (imleç sorununu çözmek için daha akıllı replace)
  editor.addEventListener("input", (e) => {
    // İmleç konumunu kaydet
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;

    // İçeriği al (textContent ile, HTML bozulmasın)
    let text = editor.textContent;

    // Pattern'leri replace et (örnek: \alpha → α)
    const replacements = [
      { pattern: /\\alpha/g, replacement: "α" },
      // Word'ün Math AutoCorrect listesiyle daha fazla ekle, ör:
      // { pattern: /\\beta/g, replacement: 'β' },
      // { pattern: /\\infty/g, replacement: '∞' },
      // vb.
    ];

    let replaced = false;
    replacements.forEach(({ pattern, replacement }) => {
      if (pattern.test(text)) {
        text = text.replace(pattern, replacement);
        replaced = true;
      }
    });

    if (replaced) {
      // İçeriği güncelle (ama HTML'i koru, sadece text'i replace et - basitlik için innerText kullan)
      editor.innerText = text;

      // İmleci eski konuma geri koy (yaklaşık olarak)
      const newRange = document.createRange();
      newRange.setStart(editor.firstChild || editor, startOffset); // Yaklaşık konum
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  });

  // Placeholder yönetimi (focus/blur ile)
  const placeholder = editor.getAttribute("data-placeholder");
  editor.addEventListener("focus", () => {
    if (editor.innerHTML.trim() === "") {
      editor.innerHTML = ""; // Placeholder'ı temizle
    }
  });
  editor.addEventListener("blur", () => {
    if (editor.innerHTML.trim() === "") {
      editor.innerHTML = ""; // CSS ::before yönetiyor
    }
  });

  // Margin-bottom select change event
  const mbSelect = document.getElementById("mb-select");
  mbSelect.addEventListener("change", applyMarginBottom);

  // Margin-bottom uygulama fonksiyonu
  function applyMarginBottom() {
    const outputContent = document.getElementById("output_content-s");
    if (!outputContent) return;

    const mbValue = mbSelect.value + "px";

    // İçindeki her child div'e uygula (eğer div yoksa, genel child'lara)
    const children = outputContent.querySelectorAll("div, p, span, img"); // Geniş tut, img dahil
    children.forEach((child) => {
      child.style.marginBottom = mbValue;
    });
  }

  // Editor içeriğini normalize eden fonksiyon
  // function normalizeEditorContent(html) {
  //   const tempDiv = document.createElement("div");
  //   tempDiv.innerHTML = html;

  //   const normalizedChildren = [];
  //   let currentDiv = null;

  //   tempDiv.childNodes.forEach((node) => {
  //     if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
  //       if (!currentDiv) {
  //         currentDiv = document.createElement("div");
  //       }
  //       currentDiv.appendChild(node.cloneNode(true));
  //     } else if (
  //       node.tagName === "IMG" ||
  //       node.tagName === "SPAN" ||
  //       node.tagName === "BR"
  //     ) {
  //       if (!currentDiv) {
  //         currentDiv = document.createElement("div");
  //       }
  //       currentDiv.appendChild(node.cloneNode(true));
  //     } else if (node.tagName === "DIV") {
  //       if (currentDiv) {
  //         normalizedChildren.push(currentDiv);
  //         currentDiv = null;
  //       }
  //       const clonedDiv = node.cloneNode(true);
  //       if (clonedDiv.innerHTML.trim() !== "") {
  //         normalizedChildren.push(clonedDiv);
  //       }
  //     } else {
  //       // Diğer blok elemanlar için benzer
  //       if (currentDiv) {
  //         normalizedChildren.push(currentDiv);
  //         currentDiv = null;
  //       }
  //       normalizedChildren.push(node.cloneNode(true));
  //     }
  //   });

  //   if (currentDiv) {
  //     normalizedChildren.push(currentDiv);
  //   }

  //   // Normalized HTML'i döndür
  //   return normalizedChildren.map((child) => child.outerHTML).join("");
  // }
  function normalizeEditorContent(html) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    const normalizedChildren = [];
    let currentDiv = null;

    tempDiv.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
        // Text node varsa currentDiv’e ekle
        if (!currentDiv) currentDiv = document.createElement("div");
        currentDiv.appendChild(node.cloneNode(true));
      } else if (node.tagName === "IMG" || node.tagName === "SPAN") {
        // Inline node’ları currentDiv içine ekle
        if (!currentDiv) currentDiv = document.createElement("div");
        currentDiv.appendChild(node.cloneNode(true));
      } else if (node.tagName === "BR") {
        // BR ignore ediliyor, yeni div açılmıyor
        // isteğe bağlı: currentDiv içinde küçük boşluk bırakmak için
        if (!currentDiv) currentDiv = document.createElement("div");
        // currentDiv.appendChild(document.createTextNode(" ")); // opsiyonel boşluk
      } else if (node.tagName === "DIV") {
        // Blok div varsa önce currentDiv’i push et
        if (currentDiv) {
          normalizedChildren.push(currentDiv);
          currentDiv = null;
        }
        const clonedDiv = node.cloneNode(true);
        if (clonedDiv.innerHTML.trim() !== "")
          normalizedChildren.push(clonedDiv);
      } else {
        // Diğer blok elemanlar
        if (currentDiv) {
          normalizedChildren.push(currentDiv);
          currentDiv = null;
        }
        normalizedChildren.push(node.cloneNode(true));
      }
    });

    if (currentDiv) normalizedChildren.push(currentDiv);

    return normalizedChildren.map((child) => child.outerHTML).join("");
  }
});
