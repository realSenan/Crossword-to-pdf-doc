
# Crossword Puzzle Generator & SVG PDF Exporter

**Generate custom crossword puzzles and export them as high-quality PDF using SVG for crisp rendering.**

## Features

* **Automatic Word Placement**

  * Words are placed horizontally and vertically.
  * Intersections are calculated automatically for correct alignment.
  * Each word’s starting cell is numbered for clarity.

* **Clues Management**

  * Generates horizontal (ACROSS) and vertical (DOWN) clues automatically.
  * Optionally hide or show solution letters.

* **PDF Export**

  * Grid and clues are exported as **SVG inside PDF**, ensuring sharp text and graphics.
  * Supports multi-page PDF with proper scaling.
  * Responsive layout adjusts crossword to A4 page size automatically.

* **User-Friendly**

  * Title input for PDF naming.
  * Validation alerts for missing crossword or title.

## How it Works

1. User inputs words in a comma-separated format.
2. The generator places the words on a dynamic grid using intersection logic.
3. Horizontal and vertical clues are automatically numbered.
4. Grid and clues are rendered in HTML.
5. On export, the grid and clues are converted to **SVG**, preserving vector quality.
6. The SVG is embedded into a PDF with proper scaling and multi-page support.

## Technologies

* JavaScript (Vanilla)
* HTML / CSS
* [jspdf](https://github.com/parallax/jsPDF) for PDF generation
* [html-to-image](https://github.com/bubkoo/html-to-image) for SVG conversion

## Example

* Input: `APPLE, ORANGE, BANANA, GRAPE`
* Output: A clean crossword grid with numbered clues and an export-ready SVG PDF.


<img width="1920" height="951" alt="image" src="https://github.com/user-attachments/assets/f5593060-e8f5-4bbb-9dda-f8239b0b153a" />
