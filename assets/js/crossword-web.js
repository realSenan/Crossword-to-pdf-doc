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

const loader = document.querySelector(".loader-wrapper");
const exportButton = document.querySelector(".exportButton");

exportButton.addEventListener("click", (e) => {
  loader.classList.add("active");
  e.preventDefault();
  setTimeout(() => {
    exportPDF();
  }, 0);
});

// async function exportPDF() {
//   loader.classList.add("active");
//   const grid = document.querySelector("#crosswordGrid");
//   const textDiv = document.querySelector("#output_content-s");
//   const titleInput = document.querySelector("#pdfTitleInput");
//   const errorBox = document.querySelector("#pdfErrorMsg");
//   errorBox.classList.add("show");

//   errorBox.textContent = "";

//   const title = titleInput.value.trim();
//   if (!title) {
//     errorBox.textContent = "Lütfen PDF başlığı girin.";
//     errorBox.classList.add("error");
//     errorBox.classList.remove("success");
//     loader.classList.remove("active");
//     return;
//   }
//   if (!grid || grid.children.length === 0) {
//     errorBox.textContent = "Crossword oluşturulmamış.";
//     errorBox.classList.add("error");
//     errorBox.classList.remove("success");
//     loader.classList.remove("active");
//     return;
//   }
//   errorBox.classList.add("success");
//     errorBox.textContent = `${title}.pdf, başarıyla oluşturuldu.`;

//   // Geçici container
//   const tempContainer = document.createElement("div");
//   tempContainer.style.position = "fixed";
//   tempContainer.style.top = "0";
//   tempContainer.style.left = "0";
//   tempContainer.style.background = "white";
//   tempContainer.style.color = "black";
//   tempContainer.style.padding = "20px";
//   tempContainer.style.width = "800px";
//   tempContainer.style.boxSizing = "border-box";

//   // Başlık
//   const titleElem = document.createElement("h1");
//   titleElem.style.color = "black";
//   titleElem.textContent = title;
//   titleElem.style.textAlign = "center";
//   titleElem.style.marginBottom = "40px";
//   titleElem.style.fontSize = "26px";
//   tempContainer.appendChild(titleElem);

//   // Grid ve Text kopyala
//   // Grid kopyası alındı ve ortalandı
//   // Grid için wrapper div oluştur
//   const gridWrapper = document.createElement("div");
//   gridWrapper.style.display = "block"; // blok olmalı
//   // gridWrapper.style.width = "fit-content"; // grid doğal genişliği
//   gridWrapper.style.margin = "20px auto"; // üst-alt 20px, yatay ortala

//   // Grid’i wrapper içine ekle
//   const gridClone = grid.cloneNode(true);
//   gridWrapper.appendChild(gridClone);

//   // Temp container’a wrapper’ı ekle
//   try {
//     tempContainer.appendChild(gridWrapper);
//     // tempContainer.appendChild(gridClone);
//     tempContainer.appendChild(textDiv.cloneNode(true));

//     document.body.appendChild(tempContainer);

//   } catch (error) {
//     errorBox.textContent = "Lütfen aşağıdan metin girin.";
//     errorBox.classList.add("error");
//     errorBox.classList.remove("success");
//     // errorBox.classList.remove("show");
//     loader.classList.remove("active");
//     return
//   } finally {
//   }

//   let fullCanvas;
//   try {
//     fullCanvas = await htmlToImage.toCanvas(tempContainer);
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

//   const maxWidth = pageWidth - 2 * margin;
//   const scale = (maxWidth / fullCanvas.width) * 1.1;
//   const scaledWidth = fullCanvas.width * scale;
//   const xPos = (pageWidth - scaledWidth) / 2;

//   const availablePxPerPage = (pageHeight - 2 * margin) / scale;

//   let renderedPx = 0;

//   while (renderedPx < fullCanvas.height) {
//     const sliceHeight = Math.min(
//       availablePxPerPage,
//       fullCanvas.height - renderedPx
//     );

//     // Yeni canvas oluştur ve slice al
//     const pageCanvas = document.createElement("canvas");
//     pageCanvas.width = fullCanvas.width;
//     pageCanvas.height = sliceHeight;
//     const ctx = pageCanvas.getContext("2d");
//     ctx.drawImage(
//       fullCanvas,
//       0,
//       renderedPx,
//       fullCanvas.width,
//       sliceHeight, // kaynak
//       0,
//       0,
//       fullCanvas.width,
//       sliceHeight // hedef
//     );

//     const imgData = pageCanvas.toDataURL("image/png");

//     if (renderedPx > 0) pdf.addPage();
//     pdf.addImage(
//       imgData,
//       "PNG",
//       xPos,
//       margin,
//       scaledWidth,
//       sliceHeight * scale
//     );

//     renderedPx += sliceHeight;
//   }
//   loader.classList.remove("active");
//   pdf.save(`${title}.pdf`);
//   document.body.removeChild(tempContainer);
// }

async function exportPDF() {
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

  const tempContainer = document.createElement("div");
  tempContainer.style.position = "fixed";
  tempContainer.style.top = "0";
  tempContainer.style.left = "0";
  tempContainer.style.background = "white";
  tempContainer.style.color = "black";
  tempContainer.style.padding = "20px";
  tempContainer.style.width = "800px";
  tempContainer.style.boxSizing = "border-box";

  const titleElem = document.createElement("h1");
  titleElem.style.color = "black";
  titleElem.textContent = title;
  titleElem.style.textAlign = "center";
  titleElem.style.marginBottom = "40px";
  titleElem.style.fontSize = "26px";
  tempContainer.appendChild(titleElem);

  const gridWrapper = document.createElement("div");
  gridWrapper.style.display = "block";
  gridWrapper.style.margin = "20px auto";

  const gridClone = grid.cloneNode(true);
  gridWrapper.appendChild(gridClone);

  try {
    tempContainer.appendChild(gridWrapper);
    tempContainer.appendChild(textDiv.cloneNode(true));

    document.body.appendChild(tempContainer);

    // document.body.appendChild(tempContainer); // önce DOM’da olmalı
    const gridWidth = gridClone.offsetWidth;

    // PDF max genişlik
    const maxPdfWidth = 700; // A4 px karşılığı (marginlerden sonra)

    // Eğer grid büyükse scale et
    if (gridWidth > maxPdfWidth) {
      const scaleFactor = maxPdfWidth / gridWidth;
      gridClone.style.transform = `scale(${scaleFactor})`;
      gridClone.style.transformOrigin = "top left";

      // scale küçülttüğü için wrapper’ın yüksekliğini düzelt
      gridWrapper.style.height = gridClone.offsetHeight * scaleFactor + "px";
    }
  } catch (error) {
    errorBox.textContent = "Lütfen aşağıdan metin girin.";
    errorBox.classList.add("error");
    errorBox.classList.remove("success");
    loader.classList.remove("active");
    return;
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

  // RESPONSIVE SCALE EKLENDİ
  let scale = maxWidth / fullCanvas.width;
  if (scale > 1) scale = 1; // Küçükse büyütme yok

  const scaledWidth = fullCanvas.width * scale;
  const xPos = (pageWidth - scaledWidth) / 2;

  const availablePxPerPage = (pageHeight - 2 * margin) / scale;

  let renderedPx = 0;

  while (renderedPx < fullCanvas.height) {
    const sliceHeight = Math.min(
      availablePxPerPage,
      fullCanvas.height - renderedPx
    );

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = fullCanvas.width;
    pageCanvas.height = sliceHeight;
    const ctx = pageCanvas.getContext("2d");
    ctx.drawImage(
      fullCanvas,
      0,
      renderedPx,
      fullCanvas.width,
      sliceHeight,
      0,
      0,
      fullCanvas.width,
      sliceHeight
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
