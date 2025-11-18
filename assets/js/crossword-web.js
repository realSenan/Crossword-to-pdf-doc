let currentGenerator = null;
let showAnswers = false;

class CrosswordGenerator {
  constructor(gridSize = 40) {
    this.gridSize = gridSize;
    this.grid = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill("."));
    this.words = [];
    this.placements = [];
    this.cellNumbers = {};
    this.originalWordCount = 0;
  }

  parseWords(input) {
    this.words = input
      .split(",")
      .map((word) => word.trim().toUpperCase())
      .filter((word) => word.length > 2);
    this.originalWordCount = this.words.length;
    return this.words;
  }

  canPlaceWord(word, row, col, isHorizontal) {
    if (isHorizontal && col + word.length > this.gridSize) return false;
    if (!isHorizontal && row + word.length > this.gridSize) return false;

    let intersectionCount = 0;

    for (let i = 0; i < word.length; i++) {
      const r = isHorizontal ? row : row + i;
      const c = isHorizontal ? col + i : col;

      const cellContent = this.grid[r][c];

      // Conflict: cell has different letter
      if (cellContent !== "." && cellContent !== word[i]) {
        return false;
      }

      // Intersection: cell has matching letter
      if (cellContent === word[i] && cellContent !== ".") {
        intersectionCount++;
      }

      // Check for unwanted adjacency (word touching but not intersecting)
      if (cellContent === ".") {
        if (isHorizontal) {
          const above = r > 0 ? this.grid[r - 1][c] : ".";
          const below = r < this.gridSize - 1 ? this.grid[r + 1][c] : ".";

          if (above !== "." || below !== ".") {
            return false; // Would create unwanted adjacency
          }
        } else {
          const left = c > 0 ? this.grid[r][c - 1] : ".";
          const right = c < this.gridSize - 1 ? this.grid[r][c + 1] : ".";

          if (left !== "." || right !== ".") {
            return false; // Would create unwanted adjacency
          }
        }
      }
    }

    // --- Yeni kontrol: kelimenin hemen başı ve sonu aynı doğrultuda dolu olmamalı ---
    // Bu, bitişik ama kesişmeyen kelimelerin arka arkaya gelmesini engeller.
    if (isHorizontal) {
      const leftCol = col - 1;
      const rightCol = col + word.length;
      // Eğer sol komşu hücre dolu ise ve sol hücre yeni kelimenin parçası değilse engelle
      if (leftCol >= 0 && this.grid[row][leftCol] !== ".") {
        // Ancak sol hücre eğer mevcut bir kelimenin kesiştiği hücre ise (yani aynı hücre)
        // burası sol komşu olduğu için kesinlikle kesişme değil -> engelle
        return false;
      }
      if (rightCol < this.gridSize && this.grid[row][rightCol] !== ".") {
        return false;
      }
    } else {
      const topRow = row - 1;
      const bottomRow = row + word.length;
      if (topRow >= 0 && this.grid[topRow][col] !== ".") {
        return false;
      }
      if (bottomRow < this.gridSize && this.grid[bottomRow][col] !== ".") {
        return false;
      }
    }
    // --- Yeni kontrol sonu ---

    // First word or must have at least one intersection
    return this.placements.length === 0 || intersectionCount > 0;
  }

  isWordPlaced(word) {
    return this.placements.some((p) => p.word === word);
  }

  placeWord(word, row, col, isHorizontal) {
    if (!this.canPlaceWord(word, row, col, isHorizontal)) {
      return false;
    }

    for (let i = 0; i < word.length; i++) {
      const r = isHorizontal ? row : row + i;
      const c = isHorizontal ? col + i : col;
      this.grid[r][c] = word[i];
    }

    this.placements.push({ word, row, col, isHorizontal });
    return true;
  }

  findPossiblePlacements(word) {
    const positions = [];
    if (!word || !this.placements) return positions;

    // Try to place word at every intersection point with existing words
    for (const placement of this.placements) {
      if (!placement || !placement.word) continue;
      for (let j = 0; j < word.length; j++) {
        for (let k = 0; k < placement.word.length; k++) {
          if (word[j] === placement.word[k]) {
            const newRow = placement.isHorizontal
              ? placement.row - j
              : placement.row + k;
            const newCol = placement.isHorizontal
              ? placement.col + k
              : placement.col - j;

            const isHorizontal = !placement.isHorizontal;

            if (
              Number.isInteger(newRow) &&
              Number.isInteger(newCol) &&
              newRow >= 0 &&
              newRow < this.gridSize &&
              newCol >= 0 &&
              newCol < this.gridSize
            ) {
              positions.push({
                row: newRow,
                col: newCol,
                isHorizontal,
                intersectionPoint: k,
              });
            }
          }
        }
      }
    }

    return positions;
  }

  generate() {
    if (!this.words || this.words.length === 0) return false;

    // Sort words by length (longest first)
    const sortedWords = [...this.words].sort((a, b) => b.length - a.length);

    // Place first word in center horizontally
    const firstWord = sortedWords[0];
    const startRow = Math.floor(this.gridSize / 2);
    const startCol = Math.floor((this.gridSize - firstWord.length) / 2);

    if (!this.placeWord(firstWord, startRow, startCol, true)) {
      return false;
    }

    // Place remaining words with strict intersection rules
    for (const word of sortedWords.slice(1)) {
      try {
        if (!word) continue;
        if (this.isWordPlaced(word)) continue;

        let placed = false;
        const possiblePositions = this.findPossiblePlacements(word);

        // Randomize to get different layouts
        possiblePositions.sort(() => Math.random() - 0.5);

        for (const pos of possiblePositions) {
          if (!pos) continue;
          if (this.placeWord(word, pos.row, pos.col, pos.isHorizontal)) {
            placed = true;
            break;
          }
        }

        // If couldn't place with intersections, skip this word (strict crossword rule)
      } catch (err) {
        // Koruyucu catch - tek bir kelime hatayı kırmasın
        console.warn("Place error for word:", word, err);
        continue;
      }
    }

    this.assignCellNumbers();
    return this.placements.length > 0;
  }

  assignCellNumbers() {
    this.cellNumbers = {};
    let numberCounter = 1;

    // First pass: standard numbering by scanning row-major
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.grid[i][j] !== ".") {
          const isStartOfAcross =
            (j === 0 || this.grid[i][j - 1] === ".") &&
            j + 1 < this.gridSize &&
            this.grid[i][j + 1] !== ".";

          const isStartOfDown =
            (i === 0 || this.grid[i - 1][j] === ".") &&
            i + 1 < this.gridSize &&
            this.grid[i + 1][j] !== ".";

          if (isStartOfAcross || isStartOfDown) {
            this.cellNumbers[`${i}-${j}`] = numberCounter;
            numberCounter++;
          }
        }
      }
    }

    // Second pass: ensure every placement's starting cell has a number.
    // This prevents "undefined" when a placement's true start wasn't caught
    // by the above logic (edge cases). We assign remaining numbers in row-major
    // order of placements to keep numbering stable.
    const placementsSorted = [...this.placements].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

    for (const p of placementsSorted) {
      if (!p) continue;
      const key = `${p.row}-${p.col}`;
      if (typeof this.cellNumbers[key] === "undefined") {
        // assign next available number
        this.cellNumbers[key] = numberCounter;
        numberCounter++;
      }
    }
  }

  getGridBounds() {
    let minRow = this.gridSize,
      maxRow = -1,
      minCol = this.gridSize,
      maxCol = -1;

    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.grid[i][j] !== ".") {
          minRow = Math.min(minRow, i);
          maxRow = Math.max(maxRow, i);
          minCol = Math.min(minCol, j);
          maxCol = Math.max(maxCol, j);
        }
      }
    }

    return {
      minRow: minRow === this.gridSize ? 0 : minRow,
      maxRow: maxRow === -1 ? 0 : maxRow,
      minCol: minCol === this.gridSize ? 0 : minCol,
      maxCol: maxCol === -1 ? 0 : maxCol,
    };
  }
}

// function generateCrossword() {
//   const input = document.getElementById("wordsInput").value;
//   const errorMsg = document.getElementById("errorMsg");
//   const successMsg = document.getElementById("successMsg");
//   const result = document.getElementById("result");

//   errorMsg.classList.remove("show");
//   successMsg.classList.remove("show");
//   showAnswers = false;

//   if (!input || !input.trim()) {
//     showError("Lütfen en az bir kelime girin!");
//     return;
//   }

//   const generator = new CrosswordGenerator(40);
//   const words = generator.parseWords(input);

//   if (!words || words.length === 0) {
//     showError("Lütfen 3 harften uzun kelimeler girin!");
//     return;
//   }

//   const originalCount = words.length;
//   let success = false;
//   let attempts = 0;
//   const maxAttempts = 50;

//   while (!success && attempts < maxAttempts) {
//     // reset grid safely
//     generator.grid = Array(generator.gridSize)
//       .fill(null)
//       .map(() => Array(generator.gridSize).fill("."));
//     generator.placements = [];
//     generator.cellNumbers = {};
//     try {
//       success = generator.generate();
//     } catch (err) {
//       console.warn("Generate attempt failed:", err);
//       success = false;
//     }
//     attempts++;
//   }

//   if (!success || !generator.placements || generator.placements.length === 0) {
//     // temizle özet
//     const sumElFail = document.getElementById("countSummary");
//     if (sumElFail) sumElFail.textContent = "";
//     showError(
//       "Crossword oluşturulamadı. Lütfen başka kelimeler deneyin veya yeniden oluşturmayı deneyin."
//     );
//     return;
//   }

//   currentGenerator = generator;
//   displayCrossword(generator);

//   const placedCount = generator.placements.length;
//   successMsg.textContent =
//     placedCount === originalCount
//       ? `✓ Tüm ${originalCount} kelime başarıyla yerleştirildi!`
//       : `✓ ${placedCount} / ${originalCount} kelime yerleştirildi.`;
//   successMsg.classList.add("show");
//   result.style.display = "flex";

//   // Güncelle: clues altında toplam özet göster
//   const sumEl = document.getElementById("countSummary");
//   if (sumEl) {
//     sumEl.textContent = `${placedCount}/${originalCount}`;
//   }
// }

function generateCrossword() {
  const input = document.getElementById("wordsInput").value;
  const errorMsg = document.getElementById("errorMsg");
  const successMsg = document.getElementById("successMsg");
  const result = document.getElementById("result");
  const pdfTitleSection = document.getElementById("pdfTitleSection");
  const errorBox = document.querySelector("#pdfErrorMsg");

  errorMsg.classList.remove("show");
  successMsg.classList.remove("show");
  showAnswers = false;

  if (!input || !input.trim()) {
    showError("Lütfen en az bir kelime girin!");
    // pdfTitleSection.style.display = "none";
  // errorBox.classList.remove("show");
    return;
  }

  const generator = new CrosswordGenerator(40);
  const words = generator.parseWords(input);

  if (!words || words.length === 0) {
    showError("Lütfen 3 harften uzun kelimeler girin!");
    // pdfTitleSection.style.display = "none";
    return;
  }

  const originalCount = words.length;
  let success = false;
  let attempts = 0;
  const maxAttempts = 50;

  while (!success && attempts < maxAttempts) {
    generator.grid = Array(generator.gridSize)
      .fill(null)
      .map(() => Array(generator.gridSize).fill("."));
    generator.placements = [];
    generator.cellNumbers = {};

    try {
      success = generator.generate();
    } catch (err) {
      console.warn("Generate attempt failed:", err);
      success = false;
    }
    attempts++;
  }

  if (!success || !generator.placements || generator.placements.length === 0) {
    const sumElFail = document.getElementById("countSummary");
    if (sumElFail) sumElFail.textContent = "";
    pdfTitleSection.style.display = "none";
    showError(
      "Crossword oluşturulamadı. Lütfen başka kelimeler deneyin veya yeniden oluşturmayı deneyin."
    );
    return;
  }

  currentGenerator = generator;
  displayCrossword(generator);

  // !PDF section'ını göster
  pdfTitleSection.style.display = "flex";

  const placedCount = generator.placements.length;
  successMsg.textContent =
    placedCount === originalCount
      ? `✓ Tüm ${originalCount} kelime başarıyla yerleştirildi!`
      : `✓ ${placedCount} / ${originalCount} kelime yerleştirildi.`;
  successMsg.classList.add("show");
  result.style.display = "flex";

  const sumEl = document.getElementById("countSummary");
  if (sumEl) {
    sumEl.textContent = `${placedCount}/${originalCount}`;
  }
}

function regenerateCrossword() {
  const input = document.getElementById("wordsInput").value;
  if (input.trim()) {
    generateCrossword();
  }
}

function toggleAnswers() {
  if (!currentGenerator) return;

  showAnswers = !showAnswers;

  // update button text if present
  const toggleBtn = document.getElementById("toggleBtn");
  if (toggleBtn) {
    toggleBtn.textContent = showAnswers
      ? "Cevapları Gizle"
      : "Cevapları Göster";
  }

  // Re-render grid so letters are shown/hidden and download reflects state
  displayGrid(currentGenerator);
}

function displayCrossword(generator) {
  displayGrid(generator);
  displayClues(generator);
}

function displayGrid(generator) {
  const gridDiv = document.getElementById("crosswordGrid");
  gridDiv.innerHTML = "";

  const bounds = generator.getGridBounds();
  const height = bounds.maxRow - bounds.minRow + 1;
  const width = bounds.maxCol - bounds.minCol + 1;

  gridDiv.style.gridTemplateColumns = `repeat(${width}, 1fr)`;

  for (let i = bounds.minRow; i <= bounds.maxRow; i++) {
    for (let j = bounds.minCol; j <= bounds.maxCol; j++) {
      const cell = document.createElement("div");
      cell.className = "grid-cell";

      // safety: ensure indices exist
      const rowExists =
        generator.grid[i] && typeof generator.grid[i][j] !== "undefined";

      if (!rowExists || generator.grid[i][j] === ".") {
        cell.classList.add("black");
      } else {
        const cellNumber = generator.cellNumbers[`${i}-${j}`];

        if (cellNumber) {
          const numberSpan = document.createElement("span");
          numberSpan.className = "cell-number";
          numberSpan.textContent = cellNumber;
          cell.appendChild(numberSpan);
        }

        const letterSpan = document.createElement("span");
        letterSpan.className = "cell-letter";
        letterSpan.textContent = generator.grid[i][j];
        if (!showAnswers) {
          letterSpan.classList.add("hidden");
        }
        cell.appendChild(letterSpan);
      }

      gridDiv.appendChild(cell);
    }
  }
}

function displayClues(generator) {
  const acrossList = document.getElementById("cluesAcross");
  const downList = document.getElementById("cluesDown");

  acrossList.innerHTML = "";
  downList.innerHTML = "";

  const safeNum = (n) => (typeof n === "number" ? n : Infinity);

  const horizontal = (generator.placements || [])
    .filter((p) => p && p.isHorizontal)
    .sort((a, b) => {
      const numA = safeNum(generator.cellNumbers[`${a.row}-${a.col}`]);
      const numB = safeNum(generator.cellNumbers[`${b.row}-${b.col}`]);
      return numA - numB;
    });

  const vertical = (generator.placements || [])
    .filter((p) => p && !p.isHorizontal)
    .sort((a, b) => {
      const numA = safeNum(generator.cellNumbers[`${a.row}-${a.col}`]);
      const numB = safeNum(generator.cellNumbers[`${b.row}-${b.col}`]);
      return numA - numB;
    });

  horizontal.forEach((p) => {
    if (!p) return;
    const num = generator.cellNumbers[`${p.row}-${p.col}`] || "";
    const li = document.createElement("li");
    li.innerHTML = `<strong>${num}.</strong> ${p.word}`;
    acrossList.appendChild(li);
  });

  vertical.forEach((p) => {
    if (!p) return;
    const num = generator.cellNumbers[`${p.row}-${p.col}`] || "";
    const li = document.createElement("li");
    li.innerHTML = `<strong>${num}.</strong> ${p.word}`;
    downList.appendChild(li);
  });
}

function downloadCrossword() {
  if (!currentGenerator) return;

  const canvas = document.getElementById("exportCanvas");
  const generator = currentGenerator;
  const bounds = generator.getGridBounds();

  const cellSize = 35;
  const padding = 10;
  const height = bounds.maxRow - bounds.minRow + 1;
  const width = bounds.maxCol - bounds.minCol + 1;

  const canvasWidth = width * cellSize + padding * 2;
  const canvasHeight = height * cellSize + padding * 2;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  for (let i = bounds.minRow; i <= bounds.maxRow; i++) {
    for (let j = bounds.minCol; j <= bounds.maxCol; j++) {
      const x = padding + (j - bounds.minCol) * cellSize;
      const y = padding + (i - bounds.minRow) * cellSize;

      if (generator.grid[i][j] === ".") {
        // Transparent - do nothing
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);

        const cellNumber = generator.cellNumbers[`${i}-${j}`];
        if (cellNumber) {
          ctx.fillStyle = "#333";
          ctx.font = "bold 8px Arial";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(cellNumber, x + 2, y + 1);
        }

        if (showAnswers) {
          ctx.fillStyle = "#333";
          ctx.font = "bold 16px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            generator.grid[i][j],
            x + cellSize / 2,
            y + cellSize / 2
          );
        }
      }
    }
  }

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crossword-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

function showError(message) {
  const errorMsg = document.getElementById("errorMsg");
  errorMsg.textContent = message;
  errorMsg.classList.add("show");
  // temizle özet
  const sumEl = document.getElementById("countSummary");
  if (sumEl) sumEl.textContent = "";
}
// !Crossword resmini PDF'e ekle - SVG VERSİYONU ******************************************************
// PDF oluşturma fonksiyonu - SVG DESTEKLİ
async function generatePDF() {
  if (!currentGenerator) return;

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const title = document.getElementById("pdfTitleInput").value || "Crossword";

  // 1. Sayfa: Crossword grid (SVG olarak)
  await addCrosswordGridAsSVGToPDF(pdf, title, pageWidth, pageHeight);

  // 2. Sayfa: Clues/Content
  await addContentWrapperToPDF(pdf, pageWidth, pageHeight);

  // PDF indir
  const pdfBlob = pdf.output("blob");
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `crossword-${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Crossword grid'i SVG olarak oluştur ve PDF'e ekle
async function addCrosswordGridAsSVGToPDF(pdf, title, pageWidth, pageHeight) {
  const svgString = generateCrosswordSVG();

  // BAŞLIK
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(title, 20, 25);

  // SVG'yi PDF'e ekle
  const svgWidth = pageWidth * 0.85;
  const svgHeight = svgWidth * 0.8; // Oranı koru

  const svgX = (pageWidth - svgWidth) / 2;
  const svgY = 35;

  pdf.addSvgAsImage(svgString, svgX, svgY, svgWidth, svgHeight);
}

// Crossword için SVG oluştur
function generateCrosswordSVG() {
  if (!currentGenerator) return "";

  const generator = currentGenerator;
  const bounds = generator.getGridBounds();
  const cellSize = 30; // SVG için biraz daha küçük hücreler
  const padding = 20;

  const width = bounds.maxCol - bounds.minCol + 1;
  const height = bounds.maxRow - bounds.minRow + 1;

  const svgWidth = width * cellSize + padding * 2;
  const svgHeight = height * cellSize + padding * 2;

  let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;

  // Arka plan
  svg += `<rect width="100%" height="100%" fill="white"/>`;

  // Hücreleri çiz
  for (let i = bounds.minRow; i <= bounds.maxRow; i++) {
    for (let j = bounds.minCol; j <= bounds.maxCol; j++) {
      const x = padding + (j - bounds.minCol) * cellSize;
      const y = padding + (i - bounds.minRow) * cellSize;

      if (generator.grid[i][j] === ".") {
        // BOŞ HÜCRE - hiçbir şey çizme
      } else {
        // DOLU HÜCRE
        svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="white" stroke="black" stroke-width="1"/>`;

        // Hücre numaraları
        const cellNumber = generator.cellNumbers[`${i}-${j}`];
        if (cellNumber) {
          svg += `<text x="${x + 2}" y="${
            y + 8
          }" font-family="Arial" font-size="8" font-weight="bold" fill="#333">${cellNumber}</text>`;
        }

        // Harfler (cevaplar gösteriliyorsa)
        if (showAnswers) {
          svg += `<text x="${x + cellSize / 2}" y="${
            y + cellSize / 2 + 4
          }" font-family="Arial" font-size="14" font-weight="bold" fill="black" text-anchor="middle" dominant-baseline="middle">${
            generator.grid[i][j]
          }</text>`;
        }
      }
    }
  }

  svg += "</svg>";
  return svg;
}

// jsPDF'ye SVG ekleme desteği ekle (gerekirse)
if (typeof jsPDF !== "undefined") {
  jsPDF.API.addSvgAsImage = function (svg, x, y, w, h) {
    const svgData =
      "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    return this.addImage(svgData, "SVG", x, y, w, h);
  };
}

// YENİ SAYFA DESTEKLİ CONTENT EKLEME - AYNI KALDI
async function addContentWrapperToPDF(pdf, pageWidth, pageHeight) {
  const contentWrapper = document.querySelector(
    "#output_content-s .content-wrapper"
  );
  if (!contentWrapper) return;

  // Yeni sayfa ekle
  pdf.addPage();

  // Geçici container
  const tempContainer = document.createElement("div");
  tempContainer.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: 800px;
    background: white;
    padding: 20px;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #333;
    box-sizing: border-box;
    z-index: 10000;
    opacity: 0.99;
  `;

  const clonedContent = contentWrapper.cloneNode(true);
  clonedContent.style.cssText = `
    width: 100%;
    padding: 0;
    margin: 0;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    color: inherit;
    background: transparent;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    box-sizing: border-box;
  `;

  tempContainer.appendChild(clonedContent);
  document.body.appendChild(tempContainer);

  try {
    const canvas = await html2canvas(tempContainer, {
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: tempContainer.offsetWidth,
      height: tempContainer.scrollHeight,
      logging: false,
    });

    const imgData = canvas.toDataURL("png");
    const imgWidth = pageWidth - 40;
    const scaleFactor = imgWidth / canvas.width;
    const totalImageHeight = canvas.height * scaleFactor;

    // SAYFA BÖLME MANTIĞI - BASİT VE ETKİLİ
    let currentY = 20; // İlk sayfa başlangıç pozisyonu
    let remainingHeight = totalImageHeight;
    const maxPageHeight = pageHeight - 20; // Sayfa alt sınırı

    while (remainingHeight > 0) {
      const availableHeight = maxPageHeight - currentY;

      if (availableHeight <= 0) {
        // Yeni sayfa ekle
        pdf.addPage();
        currentY = 20;
        continue;
      }

      const sectionHeight = Math.min(availableHeight, remainingHeight);

      // Canvas'tan parçayı al
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      tempCanvas.width = canvas.width;
      tempCanvas.height = sectionHeight / scaleFactor;

      // Orijinal canvas'tan ilgili bölümü kopyala
      const sourceY = (totalImageHeight - remainingHeight) / scaleFactor;
      tempCtx.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sectionHeight / scaleFactor,
        0,
        0,
        canvas.width,
        sectionHeight / scaleFactor
      );

      const sectionImgData = tempCanvas.toDataURL("png");

      // PDF'e parçayı ekle
      pdf.addImage(
        sectionImgData,
        "PNG",
        20,
        currentY,
        imgWidth,
        sectionHeight
      );

      // Pozisyonları güncelle
      currentY += sectionHeight;
      remainingHeight -= sectionHeight;
    }
  } catch (error) {
    console.error("Content capture error:", error);
    pdf.setFontSize(12);
    pdf.text("İçerik yüklenirken hata oluştu: " + error.message, 20, 30);
  } finally {
    // Temizlik
    if (tempContainer.parentNode) {
      tempContainer.parentNode.removeChild(tempContainer);
    }
  }
}

//! qusursuz isleyir.
// async function exportPDF() {
//   const div = document.querySelector("#output_content-s");
//   const pdf = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });

//   const dataUrl = await domtoimage.toPng(div);

//   const img = new Image();
//   img.src = dataUrl;

//   img.onload = () => {
//     const pageWidth = pdf.internal.pageSize.getWidth();
//     const imgWidth = pageWidth * 0.95;
//     const imgHeight = img.height * (imgWidth / img.width);

//     pdf.addImage(
//       img,
//       "PNG",
//       (pageWidth - imgWidth) / 2,
//       20,
//       imgWidth,
//       imgHeight
//     );
//     pdf.save("output.pdf");
//   };
// }

// async function exportPDF() {
//   const grid = document.querySelector("#crosswordGrid");
//   const titleInput = document.querySelector("#pdfTitleInput");
//   const errorBox = document.querySelector("#pdfErrorMsg");

//   errorBox.textContent = "";

//   // 1) Title kontrolü
//   const title = titleInput.value.trim();
//   if (!title) {
//     errorBox.textContent = "Lütfen PDF başlığı girin.";
//     errorBox.classList.add("pdf-error");
//     return;
//   }

//   // 2) Grid var mı?
//   if (!grid || grid.children.length === 0) {
//     errorBox.textContent = "Crossword oluşturulmamış.";
//     errorBox.classList.add("pdf-error");
//     return;
//   }

//   // 3) PNG üret (dom-to-image)
//   let dataUrl;
//   try {
//     dataUrl = await domtoimage.toPng(grid, {
//       quality: 1.0,
//       bgcolor: "white",
//     });
//   } catch (err) {
//     console.error("Görsel oluşturulamadı:", err);
//     errorBox.textContent = "PDF için görsel oluşturulamadı.";
//     return;
//   }

//   // 4) PDF oluştur
//   const pdf = new window.jspdf.jsPDF({
//     unit: "pt",
//     format: "a4",
//   });

//   const pageWidth = pdf.internal.pageSize.getWidth();
//   const pageHeight = pdf.internal.pageSize.getHeight();

//   // Görseli ölç
//   const img = new Image();
//   img.src = dataUrl;

//   img.onload = () => {
//     const imgW = img.width;
//     const imgH = img.height;

//     // PDF içine sığması için ölçekle
//     const maxWidth = pageWidth * 0.85;
//     let finalW = imgW;
//     let finalH = imgH;

//     if (finalW > maxWidth) {
//       finalW = maxWidth;
//       finalH = imgH * (maxWidth / imgW);
//     }

//     // Ortala
//     const centerX = (pageWidth - finalW) / 2;

//     // 5) Title yaz
//     pdf.setFont("Helvetica", "bold");
//     pdf.setFontSize(20);
//     pdf.text(title, pageWidth / 2, 40, { align: "center" });

//     // 6) Grid görselini ekle
//     pdf.addImage(dataUrl, "PNG", centerX, 70, finalW, finalH);

//     pdf.save("crossword.pdf");
//   };
// }

//! FULL ISLEK!
// async function exportPDF() {
//   const grid = document.querySelector("#crosswordGrid");
//   const textDiv = document.querySelector("#output_content-s");
//   const titleInput = document.querySelector("#pdfTitleInput");
//   const errorBox = document.querySelector("#pdfErrorMsg");

//   errorBox.textContent = "";

//   // Title
//   const title = titleInput.value.trim();
//   if (!title) {
//     errorBox.textContent = "Lütfen PDF başlığı girin.";
//     errorBox.classList.add("pdf-error");
//     return;
//   }

//   // Grid var mı?
//   if (!grid || grid.children.length === 0) {
//     errorBox.textContent = "Crossword oluşturulmamış.";
//     errorBox.classList.add("pdf-error");
//     return;
//   }

//   // 1) GRID PNG
//   let gridUrl;
//   try {
//     gridUrl = await domtoimage.toPng(grid, {
//       quality: 1.0,
//       bgcolor: "white",
//     });
//   } catch (err) {
//     console.error("Grid görseli alınamadı:", err);
//     errorBox.textContent = "Grid görseli oluşturulamadı.";
//     return;
//   }

//   // 2) TEXT PNG (output_content-s)
//   let textUrl;
//   try {
//     textUrl = await domtoimage.toPng(textDiv, {
//       quality: 1.0,
//       bgcolor: "white",
//     });
//   } catch (err) {
//     console.error("Text görseli alınamadı:", err);
//     errorBox.textContent = "Metin görseli oluşturulamadı.";
//     return;
//   }

//   // PDF oluştur
//   const pdf = new window.jspdf.jsPDF({
//     unit: "pt",
//     format: "a4",
//   });

//   const pageWidth = pdf.internal.pageSize.getWidth();
//   const pageHeight = pdf.internal.pageSize.getHeight();

//   // GRID image load
//   const gridImg = new Image();
//   gridImg.src = gridUrl;

//   const textImg = new Image();
//   textImg.src = textUrl;

//   gridImg.onload = () => {
//     textImg.onload = () => {
//       // =============== GRID EKLE ================
//       const maxW = pageWidth * 0.85;

//       // Grid boyutu
//       let gW = gridImg.width;
//       let gH = gridImg.height;
//       if (gW > maxW) {
//         gH = gH * (maxW / gW);
//         gW = maxW;
//       }

//       const gX = (pageWidth - gW) / 2;

//       // Title
//       pdf.setFont("Helvetica", "bold");
//       pdf.setFontSize(20);
//       pdf.text(title, pageWidth / 2, 40, { align: "center" });

//       // Grid
//       let cursorY = 70;
//       pdf.addImage(gridImg, "PNG", gX, cursorY, gW, gH);

//       cursorY += gH + 30; // 30px boşluk

//       // =============== TEXT EKLE (MULTI-PAGE) ================
//       let tW = textImg.width;
//       let tH = textImg.height;

//       const ratio = maxW / tW;
//       tW = maxW;
//       tH = tH * ratio;

//       // Eğer text yüksekliği sayfaya sığmıyorsa bölerek ekle
//       const pageBottom = pageHeight - 40;

//       let remainingHeight = tH;
//       let imgY = 0;

//       while (remainingHeight > 0) {
//         const sliceHeight = Math.min(remainingHeight, pageBottom - cursorY);

//         pdf.addImage(
//           textImg,
//           "PNG",
//           (pageWidth - tW) / 2,
//           cursorY,
//           tW,
//           tH,
//           undefined,
//           "FAST",
//           imgY / tH,
//           sliceHeight / tH
//         );

//         remainingHeight -= sliceHeight;
//         imgY += sliceHeight;

//         if (remainingHeight > 0) {
//           pdf.addPage();
//           cursorY = 40;
//         }
//       }

//       pdf.save("crossword.pdf");
//     };
//   };
// }

// async function exportPDF() {
//   const grid = document.querySelector("#crosswordGrid");
//   const outputDiv = document.querySelector("#output_content-s");
//   const titleInput = document.querySelector("#pdfTitleInput");
//   const errorBox = document.querySelector("#pdfErrorMsg");

//   errorBox.textContent = "";

//   const title = titleInput.value.trim();
//   if (!title) {
//     errorBox.textContent = "Lütfen PDF başlığı girin.";
//     return;
//   }

//   if (!grid || grid.children.length === 0) {
//     errorBox.textContent = "Crossword oluşturulmamış.";
//     return;
//   }

//   // Geçici container
//   const tempContainer = document.createElement("div");
//   tempContainer.style.padding = "20px";
//   tempContainer.style.background = "white";
//   tempContainer.style.position = "absolute";
//   // tempContainer.style.visibility = "hidden"; // Görünmez ama render oluyor
//   tempContainer.style.left = "0";
//   tempContainer.style.top = "0";
//   tempContainer.style.width = "800px";

//   // Başlık
//   const titleElem = document.createElement("h1");
//   titleElem.textContent = title;
//   titleElem.style.textAlign = "center";
//   titleElem.style.marginBottom = "20px";
//   tempContainer.appendChild(titleElem);

//   // Crossword grid
//   const gridClone = grid.cloneNode(true);
//   gridClone.style.marginBottom = "30px";
//   tempContainer.appendChild(gridClone);

//   // Output content
//   const outputClone = outputDiv.cloneNode(true);
//   tempContainer.appendChild(outputClone);

//   document.body.appendChild(tempContainer);

//   // Math/WIRIS render bitmesini bekle
//   await new Promise((resolve) => setTimeout(resolve, 500));

//   // html2canvas ile yakalama
//   const canvas = await html2canvas(tempContainer, {
//     scale: 2,
//     useCORS: true,
//     allowTaint: true,
//     backgroundColor: "#ffffff",
//   });

//   const imgData = canvas.toDataURL("image/png");

//   const pdf = new window.jspdf.jsPDF({
//     unit: "pt",
//     format: "a4",
//     orientation: "portrait",
//   });

//   const pageWidth = pdf.internal.pageSize.getWidth();
//   const pageHeight = pdf.internal.pageSize.getHeight();

//   // Görsel boyutunu ayarla
//   let imgWidth = pageWidth * 0.95;
//   let imgHeight = canvas.height * (imgWidth / canvas.width);

//   let positionY = 20;

//   // Tek sayfaya sığmazsa sayfa taşı
//   while (imgHeight > 0) {
//     const remainingHeight = Math.min(imgHeight, pageHeight - positionY);
//     pdf.addImage(
//       imgData,
//       "PNG",
//       (pageWidth - imgWidth) / 2,
//       positionY,
//       imgWidth,
//       remainingHeight,
//       undefined,
//       "FAST"
//     );

//     imgHeight -= remainingHeight;
//     positionY = 20;
//     if (imgHeight > 0) pdf.addPage();
//   }

//   pdf.save("crossword.pdf");

//   document.body.removeChild(tempContainer);
// }

// ! RESİM HEİGHT SXLMASİ
// async function exportPDF() {
//   const grid = document.querySelector("#crosswordGrid");
//   const textDiv = document.querySelector("#output_content-s");
//   const titleInput = document.querySelector("#pdfTitleInput");
//   const errorBox = document.querySelector("#pdfErrorMsg");

//   errorBox.textContent = "";

//   // 1) Title kontrolü
//   const title = titleInput.value.trim();
//   if (!title) {
//     errorBox.textContent = "Lütfen PDF başlığı girin.";
//     return;
//   }

//   // 2) Grid kontrolü
//   if (!grid || grid.children.length === 0) {
//     errorBox.textContent = "Crossword oluşturulmamış.";
//     return;
//   }

//   // 3) PNG üret (grid)
//   let gridUrl, textUrl;
//   try {
//     gridUrl = await htmlToImage.toPng(grid, {
//       backgroundColor: "white",
//       quality: 1,
//     });
//   } catch (err) {
//     console.error("Grid PNG alınamadı:", err);
//     errorBox.textContent = "Grid görseli oluşturulamadı.";
//     return;
//   }

//   // 4) PNG üret (text)
//   try {
//     textUrl = await htmlToImage.toPng(textDiv, {
//       backgroundColor: "white",
//       quality: 1,
//     });
//   } catch (err) {
//     console.error("Text PNG alınamadı:", err);
//     errorBox.textContent = "Metin görseli oluşturulamadı.";
//     return;
//   }

//   // 5) PDF oluştur
//   const pdf = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
//   const pageWidth = pdf.internal.pageSize.getWidth();
//   const pageHeight = pdf.internal.pageSize.getHeight();
//   const margin = 40;

//   // 6) Grid ekle
//   const gridImg = new Image();
//   gridImg.src = gridUrl;
//   await new Promise((resolve) => (gridImg.onload = resolve));

//   let maxW = pageWidth * 0.85;
//   let gW = gridImg.width;
//   let gH = gridImg.height;
//   if (gW > maxW) {
//     gH *= maxW / gW;
//     gW = maxW;
//   }
//   let cursorY = 70;

//   pdf.setFont("Helvetica", "bold");
//   pdf.setFontSize(20);
//   pdf.text(title, pageWidth / 2, 40, { align: "center" });

//   const gX = (pageWidth - gW) / 2;
//   pdf.addImage(gridImg, "PNG", gX, cursorY, gW, gH);
//   cursorY += gH + 30;

//   // 7) Text ekle (multi-page)
//   const textImg = new Image();
//   textImg.src = textUrl;
//   await new Promise((resolve) => (textImg.onload = resolve));

//   let tW = textImg.width;
//   let tH = textImg.height;
//   if (tW > maxW) {
//     tH *= maxW / tW;
//     tW = maxW;
//   }

//   let remainingH = tH;
//   let srcY = 0;

//   while (remainingH > 0) {
//     const availableH = pageHeight - cursorY - margin;
//     const sliceH = Math.min(remainingH, availableH);

//     pdf.addImage(
//       textImg,
//       "PNG",
//       (pageWidth - tW) / 2,
//       cursorY,
//       tW,
//       sliceH,
//       undefined,
//       "FAST",
//       0,
//       srcY,
//       textImg.width,
//       textImg.height * (sliceH / remainingH)
//     );

//     remainingH -= sliceH;
//     srcY += textImg.height * (sliceH / remainingH);

//     if (remainingH > 0) {
//       pdf.addPage();
//       cursorY = margin;
//     }
//   }

//   pdf.save("crossword.pdf");
// }

// ! EN İYİSİ BU FAKAT SKNTİ SAYFA BOLUNDUKDEN(yeni bir pdf sayfasina aktarildikdan) SONRA İMGA SANKİ with 100% verirsinde heightini 10 px yaparsin gibi icine girmis.
// async function exportPDF() {
//   const grid = document.querySelector("#crosswordGrid");
//   const textDiv = document.querySelector("#output_content-s");
//   const titleInput = document.querySelector("#pdfTitleInput");
//   const errorBox = document.querySelector("#pdfErrorMsg");

//   errorBox.textContent = "";

//   const title = titleInput.value.trim();
//   if (!title) {
//     errorBox.textContent = "Lütfen PDF başlığı girin.";
//     return;
//   }
//   if (!grid || grid.children.length === 0) {
//     errorBox.textContent = "Crossword oluşturulmamış.";
//     return;
//   }

//   // Geçici container
//   const tempContainer = document.createElement("div");
//   tempContainer.style.position = "fixed";
//   tempContainer.style.top = "0";
//   tempContainer.style.left = "0";
//   // tempContainer.style.opacity = "0";
//   tempContainer.style.background = "white";
//   tempContainer.style.color = "black";
//   tempContainer.style.padding = "20px";
//   // tempContainer.style.zIndex = "-1";

//   // Başlık
//   const titleElem = document.createElement("h1");
//   titleElem.textContent = title;
//   titleElem.style.textAlign = "center";
//   titleElem.style.marginBottom = "20px";
//   tempContainer.appendChild(titleElem);

//   // Grid ve Text
//   tempContainer.appendChild(grid.cloneNode(true));
//   tempContainer.appendChild(textDiv.cloneNode(true));

//   document.body.appendChild(tempContainer);

//   let containerUrl;
//   try {
//     const canvas = await htmlToImage.toCanvas(tempContainer);
//     containerUrl = canvas.toDataURL("image/png");
//   } catch (err) {
//     console.error("Container görseli alınamadı:", err);
//     errorBox.textContent = "PDF için görsel oluşturulamadı.";
//     document.body.removeChild(tempContainer);
//     return;
//   }

//   const pdf = new jspdf.jsPDF({ unit: "pt", format: "a4" });
//   const pageWidth = pdf.internal.pageSize.getWidth();
//   const pageHeight = pdf.internal.pageSize.getHeight();
//   const margin = 40;

//   const img = new Image();
//   img.src = containerUrl;
//   await new Promise((resolve) => (img.onload = resolve));

//   let imgW = img.width;
//   let imgH = img.height;
//   const maxW = pageWidth * 0.9;
//   if (imgW > maxW) {
//     imgH = imgH * (maxW / imgW);
//     imgW = maxW;
//   }

//   let cursorY = 40;
//   let remainingH = imgH;
//   let srcY = 0;

//   while (remainingH > 0) {
//     const availableH = pageHeight - cursorY - margin;

//     // Slice yüksekliğini hesapla
//     const scale = imgW / img.width; // width ölçeği
//     const sliceH = Math.min(remainingH, availableH / scale); // canvas'taki slice

//     pdf.addImage(
//       img,
//       "PNG",
//       (pageWidth - imgW) / 2,
//       cursorY,
//       imgW,
//       sliceH * scale, // doğru height
//       undefined,
//       "FAST",
//       0,
//       srcY,
//       img.width,
//       sliceH // canvas slice
//     );

//     remainingH -= sliceH;
//     srcY += sliceH;

//     if (remainingH > 0) {
//       pdf.addPage();
//       cursorY = margin;
//     }
//   }

//   pdf.save("crossword.pdf");
//   document.body.removeChild(tempContainer);
// }
//! BUDA IDELADI
// async function exportPDF() {
//   const grid = document.querySelector("#crosswordGrid");
//   const textDiv = document.querySelector("#output_content-s");
//   const titleInput = document.querySelector("#pdfTitleInput");
//   const errorBox = document.querySelector("#pdfErrorMsg");

//   errorBox.textContent = "";

//   const title = titleInput.value.trim();
//   if (!title) {
//     errorBox.textContent = "Lütfen PDF başlığı girin.";
//     return;
//   }
//   if (!grid || grid.children.length === 0) {
//     errorBox.textContent = "Crossword oluşturulmamış.";
//     return;
//   }

//   // Geçici container
//   const tempContainer = document.createElement("div");
//   tempContainer.style.position = "fixed";
//   tempContainer.style.top = "0";
//   tempContainer.style.left = "0";
//   tempContainer.style.background = "white";
//   tempContainer.style.color = "black";
//   tempContainer.style.padding = "20px";
//   tempContainer.style.width = "100%";
//   tempContainer.style.boxSizing = "border-box";

//   // Başlık
//   const titleElem = document.createElement("h1");
//   titleElem.textContent = title;
//   titleElem.style.textAlign = "center";
//   titleElem.style.marginBottom = "20px";
//   titleElem.style.fontSize = "24px";
//   tempContainer.appendChild(titleElem);

//   // Grid ve Text kopyala
//   tempContainer.appendChild(grid.cloneNode(true));
//   tempContainer.appendChild(textDiv.cloneNode(true));

//   document.body.appendChild(tempContainer);

//   let containerUrl;
//   try {
//     const canvas = await htmlToImage.toCanvas(tempContainer);
//     containerUrl = canvas.toDataURL("image/png");
//   } catch (err) {
//     console.error("Container görseli alınamadı:", err);
//     errorBox.textContent = "PDF için görsel oluşturulamadı.";
//     document.body.removeChild(tempContainer);
//     return;
//   }

//   const pdf = new jspdf.jsPDF({
//     unit: "px",
//     format: "a4",
//     orientation: "portrait",
//   });

//   const pageWidth = pdf.internal.pageSize.getWidth();
//   const pageHeight = pdf.internal.pageSize.getHeight();
//   const margin = 40;

//   const img = new Image();
//   img.src = containerUrl;

//   await new Promise((resolve) => {
//     img.onload = resolve;
//   });

//   // Görsel boyutlarını sayfaya sığacak şekilde ölçekle (genişliğe göre)
//   let imgWidth = img.width;
//   let imgHeight = img.height;

//   // Genişliğe göre ölçekle (yatayda tam sığsın)
//   const maxWidth = pageWidth - 2 * margin;
//   const scaleRatio = maxWidth / imgWidth;

//   const scaledWidth = imgWidth * scaleRatio;
//   const scaledHeight = imgHeight * scaleRatio;

//   const xPos = (pageWidth - scaledWidth) / 2; // Yatayda ortala

//   // Çok sayfalı destek
//   let currentY = margin; // İlk sayfada başlangıç pozisyonu
//   let remainingHeight = scaledHeight;
//   let sourceY = 0;

//   while (remainingHeight > 0) {
//     const availableHeight = pageHeight - currentY - margin;
//     const sliceHeight = Math.min(remainingHeight, availableHeight);

//     // Görselin sadece görünen kısmını hesapla
//     const sourceHeight = (sliceHeight / scaledHeight) * img.height;

//     pdf.addImage(
//       containerUrl,
//       "PNG",
//       xPos,
//       currentY,
//       scaledWidth,
//       sliceHeight,
//       undefined,
//       "FAST",
//       0,
//       sourceY,
//       img.width,
//       sourceHeight
//     );

//     // Kalan yüksekliği güncelle
//     remainingHeight -= sliceHeight;
//     sourceY += sourceHeight;

//     // Eğer hala içerik kaldıysa yeni sayfa ekle
//     if (remainingHeight > 0) {
//       pdf.addPage();
//       currentY = margin; // Yeni sayfada üstten margin kadar aşağıda başla
//     }
//   }

//   pdf.save("crossword.pdf");
//   document.body.removeChild(tempContainer);
// }

const loader = document.querySelector(".loader-wrapper");
const exportButton = document.querySelector(".exportButton");


exportButton.addEventListener("click", (e) => {
  e.preventDefault(); 
  exportPDF();
});

async function exportPDF() {
  loader.classList.add("active");
  const grid = document.querySelector("#crosswordGrid");
  const textDiv = document.querySelector("#output_content-s");
  const titleInput = document.querySelector("#pdfTitleInput");
  const errorBox = document.querySelector("#pdfErrorMsg");
  errorBox.classList.add("show");

  errorBox.textContent = "";

  const title = titleInput.value.trim();
  if (!title) {
    errorBox.textContent = "Lütfen PDF başlığı girin.";
    errorBox.classList.add("error");
    errorBox.classList.remove("success");
    loader.classList.remove("active");
    return;
  }
  if (!grid || grid.children.length === 0) {
    errorBox.textContent = "Crossword oluşturulmamış.";
    errorBox.classList.add("error");
    errorBox.classList.remove("success");
    loader.classList.remove("active");
    return;
  }
  errorBox.classList.add("success");
    errorBox.textContent = `${title}.pdf, başarıyla oluşturuldu.`;

  // Geçici container
  const tempContainer = document.createElement("div");
  tempContainer.style.position = "fixed";
  tempContainer.style.top = "0";
  tempContainer.style.left = "0";
  tempContainer.style.background = "white";
  tempContainer.style.color = "black";
  tempContainer.style.padding = "20px";
  tempContainer.style.width = "900px";
  tempContainer.style.boxSizing = "border-box";

  // Başlık
  const titleElem = document.createElement("h1");
  titleElem.style.color = "black";
  titleElem.textContent = title;
  titleElem.style.textAlign = "center";
  titleElem.style.marginBottom = "40px";
  titleElem.style.fontSize = "26px";
  tempContainer.appendChild(titleElem);

  // Grid ve Text kopyala
  // Grid kopyası alındı ve ortalandı
  // Grid için wrapper div oluştur
  const gridWrapper = document.createElement("div");
  gridWrapper.style.display = "block"; // blok olmalı
  gridWrapper.style.width = "fit-content"; // grid doğal genişliği
  gridWrapper.style.margin = "20px auto"; // üst-alt 20px, yatay ortala

  // Grid’i wrapper içine ekle
  const gridClone = grid.cloneNode(true);
  gridWrapper.appendChild(gridClone);

  // Temp container’a wrapper’ı ekle
  try {
    tempContainer.appendChild(gridWrapper);
    // tempContainer.appendChild(gridClone);
    tempContainer.appendChild(textDiv.cloneNode(true));

    document.body.appendChild(tempContainer);
  } catch (error) {
    errorBox.textContent = "Lütfen aşağıdan metin girin.";
    errorBox.classList.add("error");
    errorBox.classList.remove("success");
    // errorBox.classList.remove("show");
    loader.classList.remove("active");
    return
  } finally {
  }

  let fullCanvas;
  try {
    fullCanvas = await htmlToImage.toCanvas(tempContainer);
  } catch (err) {
    console.error("Container görseli alınamadı:", err);
    errorBox.textContent = "PDF için görsel oluşturulamadı.";
    document.body.removeChild(tempContainer);
    return;
  }

  const pdf = new jspdf.jsPDF({
    unit: "px",
    format: "a4",
    orientation: "portrait",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;

  const maxWidth = pageWidth - 2 * margin;
  const scale = (maxWidth / fullCanvas.width) * 1.1;
  const scaledWidth = fullCanvas.width * scale;
  const xPos = (pageWidth - scaledWidth) / 2;

  const availablePxPerPage = (pageHeight - 2 * margin) / scale;

  let renderedPx = 0;

  while (renderedPx < fullCanvas.height) {
    const sliceHeight = Math.min(
      availablePxPerPage,
      fullCanvas.height - renderedPx
    );

    // Yeni canvas oluştur ve slice al
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = fullCanvas.width;
    pageCanvas.height = sliceHeight;
    const ctx = pageCanvas.getContext("2d");
    ctx.drawImage(
      fullCanvas,
      0,
      renderedPx,
      fullCanvas.width,
      sliceHeight, // kaynak
      0,
      0,
      fullCanvas.width,
      sliceHeight // hedef
    );

    const imgData = pageCanvas.toDataURL("image/png");

    if (renderedPx > 0) pdf.addPage();
    pdf.addImage(
      imgData,
      "PNG",
      xPos,
      margin,
      scaledWidth,
      sliceHeight * scale
    );

    renderedPx += sliceHeight;
  }
  loader.classList.remove("active");
  pdf.save(`${title}.pdf`);
  document.body.removeChild(tempContainer);
} 