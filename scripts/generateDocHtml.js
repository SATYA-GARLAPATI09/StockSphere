const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const mdPath  = path.join(__dirname, '..', 'STOCKSPHERE_DOCUMENTATION.md');
const htmlPath = path.join(__dirname, '..', 'STOCKSPHERE_DOCUMENTATION.html');
const assetsDir = path.join(__dirname, '..', 'docs', 'assets');

console.log('Reading markdown from:', mdPath);
let mdContent = fs.readFileSync(mdPath, 'utf8');

// Fix roll number everywhere
mdContent = mdContent.replace(/23VV1A0558/g, '23VV1A0615');
mdContent = mdContent.replace(/23VV1A0515/g, '23VV1A0615');

const tempMd   = path.join(__dirname, 'temp_build.md');
const tempHtml = path.join(__dirname, 'temp_build.html');
fs.writeFileSync(tempMd, mdContent, 'utf8');

try {
  execSync(`npx -y marked --gfm -i "${tempMd}" -o "${tempHtml}"`);
  let body = fs.readFileSync(tempHtml, 'utf8');

  // ─────────────────────────────────────────────────
  // 1. Inline all images as base64 so the .doc file
  //    works fully offline (no broken img links)
  // ─────────────────────────────────────────────────
  body = body.replace(
    /<img\s+src="docs\/assets\/([^"]+)"\s+alt="([^"]*)"[^>]*>/g,
    (_, filename, alt) => {
      const imgFile = path.join(assetsDir, filename);
      if (!fs.existsSync(imgFile)) return `<p><em>[Image not found: ${filename}]</em></p>`;
      const b64 = fs.readFileSync(imgFile).toString('base64');
      const ext  = path.extname(filename).toLowerCase().replace('.', '') || 'png';
      return `
<figure class="doc-figure">
  <img src="data:image/${ext};base64,${b64}" alt="${alt}" class="doc-img" />
  <figcaption>${alt}</figcaption>
</figure>`;
    }
  );

  // ─────────────────────────────────────────────────
  // 2. Inject page-break markers:
  //    • Before every top-level Section heading (# 1., # 2. … # 8.)
  //    • Before table of contents
  //    Each major section starts on its own page.
  //    Sub-headings (h2/h3) do NOT force a page break.
  // ─────────────────────────────────────────────────
  const PB = '<div class="page-break"></div>\n';

  // TOC
  body = body.replace(/(<h1[^>]*>\s*CONTENTS\s*<\/h1>)/i, PB + '$1');

  // Sections 1-8
  for (let i = 1; i <= 8; i++) {
    // marked generates ids like: id="1-abstract", id="2-technology-used", etc.
    body = body.replace(
      new RegExp(`(<h1[^>]*id="${i}-[^"]*"[^>]*>)`, 'i'),
      PB + '$1'
    );
  }

  // Also catch plain <h1> that start with a digit (fallback)
  body = body.replace(
    /(<h1(?![^>]*id)[^>]*>)\s*([1-9]\.\s)/g,
    PB + '$1$2'
  );

  // ─────────────────────────────────────────────────
  // 3. Keep-together rules via CSS (printed as style
  //    classes on sensitive elements):
  //    – Tables: avoid page-break inside
  //    – Pre/code blocks: avoid page-break inside
  //    – Figures: avoid page-break inside
  //    – h2/h3: page-break-after: avoid
  //    These are handled entirely in CSS (below).
  // ─────────────────────────────────────────────────

  // ─────────────────────────────────────────────────
  // 4. Assemble final HTML with A4-optimised CSS
  // ─────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <title>StockSphere — Final Project Technical Documentation</title>

  <!--[if gte mso 9]><xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml><![endif]-->

  <style>
    /* ── PAGE SETUP ─────────────────────────────── */
    @page {
      size: A4 portrait;
      margin: 25mm 22mm 25mm 22mm;
      mso-header-margin: 12mm;
      mso-footer-margin: 12mm;
    }

    /* ── BASE ────────────────────────────────────── */
    * { box-sizing: border-box; }

    body {
      font-family: Calibri, "Segoe UI", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #1a1a2e;
      background: #fff;
      margin: 0;
      padding: 0;
    }

    /* ── PAGE BREAK ──────────────────────────────── */
    .page-break {
      page-break-after: always;
      mso-break-type: page-break;
      clear: both;
      height: 0;
    }

    /* ── HEADER BAND ─────────────────────────────── */
    .doc-header {
      width: 100%;
      border-bottom: 2.5pt solid #3730a3;
      padding-bottom: 10pt;
      margin-bottom: 22pt;
    }
    .doc-header table { width: 100%; border: none; margin: 0; }
    .doc-header td    { border: none; padding: 0; background: transparent; }
    .dept-title {
      font-size: 11pt;
      font-weight: 700;
      color: #312e81;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }
    .univ-title  { font-size: 10pt; color: #475569; font-weight: 600; }
    .roll-badge  { font-size: 13pt; font-weight: 700; color: #1e1b4b; text-align: right; }
    .year-label  { font-size: 10pt; color: #475569; text-align: right; }

    /* ── HEADINGS ─────────────────────────────────── */
    h1, h2, h3, h4 {
      font-family: Calibri, Arial, sans-serif;
      color: #0f172a;
      margin-top: 0;
      page-break-after: avoid;    /* never split heading from its body */
    }

    h1 {
      font-size: 18pt;
      color: #1e1b4b;
      border-bottom: 1.5pt solid #c7d2fe;
      padding-bottom: 6pt;
      margin-bottom: 12pt;
    }

    h2 {
      font-size: 13pt;
      color: #312e81;
      margin-top: 16pt;
      margin-bottom: 6pt;
      page-break-before: avoid;
    }

    h3 {
      font-size: 11.5pt;
      color: #4338ca;
      margin-top: 12pt;
      margin-bottom: 4pt;
      page-break-before: avoid;
    }

    h4 {
      font-size: 10.5pt;
      color: #374151;
      margin-top: 10pt;
      margin-bottom: 4pt;
    }

    /* ── PARAGRAPHS ──────────────────────────────── */
    p {
      margin: 0 0 9pt 0;
      text-align: justify;
      orphans: 3;
      widows: 3;
    }

    /* ── LISTS ───────────────────────────────────── */
    ul, ol {
      margin: 0 0 9pt 20pt;
      padding: 0;
    }
    li {
      margin-bottom: 4pt;
    }

    /* ── TABLES ──────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin: 14pt 0;
      page-break-inside: avoid;   /* keep tables on one page */
    }
    th, td {
      border: 0.75pt solid #94a3b8;
      padding: 6pt 9pt;
      vertical-align: top;
      text-align: left;
    }
    th {
      background-color: #eef2ff;
      font-weight: 700;
      color: #1e1b4b;
      border-bottom: 1.5pt solid #818cf8;
    }
    tr:nth-child(even) td { background-color: #f8fafc; }

    /* ── CODE & PRE ──────────────────────────────── */
    code {
      font-family: "Consolas", "Courier New", monospace;
      font-size: 9pt;
      background: #f1f5f9;
      color: #9d174d;
      padding: 1pt 4pt;
      border: 0.5pt solid #e2e8f0;
    }
    pre {
      background: #0f172a;
      color: #e2e8f0;
      font-family: "Consolas", "Courier New", monospace;
      font-size: 8.5pt;
      line-height: 1.45;
      padding: 12pt 14pt;
      margin: 12pt 0;
      overflow-x: auto;
      page-break-inside: avoid;  /* keep code blocks intact */
      border-left: 3pt solid #6366f1;
    }
    pre code {
      background: transparent;
      color: #e2e8f0;
      padding: 0;
      border: none;
      font-size: 8.5pt;
    }

    /* ── BLOCKQUOTE ──────────────────────────────── */
    blockquote {
      border-left: 3pt solid #6366f1;
      background: #eef2ff;
      color: #312e81;
      padding: 8pt 14pt;
      margin: 12pt 0;
      page-break-inside: avoid;
    }

    /* ── FIGURES / IMAGES ────────────────────────── */
    .doc-figure {
      text-align: center;
      margin: 16pt 0;
      page-break-inside: avoid;  /* image + caption stay together */
    }
    .doc-img {
      max-width: 95%;
      height: auto;
      border: 0.75pt solid #cbd5e1;
      box-shadow: 0 2pt 8pt rgba(0,0,0,0.10);
    }
    figcaption {
      font-size: 9.5pt;
      color: #475569;
      font-style: italic;
      margin-top: 5pt;
      text-align: center;
    }

    /* ── HORIZONTAL RULE ─────────────────────────── */
    hr {
      border: none;
      border-top: 0.75pt solid #cbd5e1;
      margin: 20pt 0;
    }

    /* ── FOOTER BAND ─────────────────────────────── */
    .doc-footer {
      width: 100%;
      border-top: 1pt solid #cbd5e1;
      margin-top: 30pt;
      padding-top: 8pt;
      font-size: 9pt;
      color: #64748b;
    }
    .doc-footer table { width: 100%; border: none; margin: 0; }
    .doc-footer td    { border: none; padding: 0; background: transparent; font-size: 9pt; }

    /* ── PRINT RESET ─────────────────────────────── */
    @media print {
      body { background: #fff; }
      .page-break {
        page-break-after: always;
        display: block;
        height: 0;
        clear: both;
      }
      pre { white-space: pre-wrap; }
    }
  </style>
</head>
<body>

  <!-- ── DOCUMENT HEADER ─────────────────── -->
  <div class="doc-header">
    <table>
      <tr>
        <td style="width:65%">
          <div class="dept-title">NoSQL Laboratory &bull; Final Project</div>
          <div class="univ-title">Department of Computer Science &amp; Engineering &bull; JNTUGV Vizianagaram</div>
        </td>
        <td style="width:35%; text-align:right;">
          <div class="roll-badge">Roll No: 23VV1A0615</div>
          <div class="year-label">Academic Year: 2025 &ndash; 2026</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- ── BODY ───────────────────────────── -->
  ${body}

  <!-- ── DOCUMENT FOOTER ─────────────────── -->
  <div class="doc-footer">
    <table>
      <tr>
        <td>noSQL LAB &ndash; CSE JNTUGV Vizianagaram</td>
        <td style="text-align:right;">Roll No: 23VV1A0615 &bull; Intelligent Inventory Management &amp; Supply Chain Knowledge Graph System</td>
      </tr>
    </table>
  </div>

</body>
</html>`;

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('\n✅  HTML generated successfully!');
  console.log('   Path:', htmlPath);
  console.log('\n   ─────────────────────────────────────────');
  console.log('   Open this file in Microsoft Word:');
  console.log('   File → Open → STOCKSPHERE_DOCUMENTATION.html');
  console.log('   Then: File → Save As → Word 97-2003 Document (.doc)');
  console.log('   ─────────────────────────────────────────\n');

} finally {
  if (fs.existsSync(tempMd))   fs.unlinkSync(tempMd);
  if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);
}
