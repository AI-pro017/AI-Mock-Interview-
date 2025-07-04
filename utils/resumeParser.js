import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import mammoth from 'mammoth';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;
}

export async function extractTextFromFile(file) {
  const fileType = file.type;
  const arrayBuffer = await file.arrayBuffer();
  
  let text = '';
  
  if (fileType === 'application/pdf') {
    text = await extractTextFromPDF(arrayBuffer);
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileType === 'application/msword') {
    text = await extractTextFromDOCX(arrayBuffer);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or Word document.');
  }
  
  return text;
}

async function extractTextFromPDF(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

async function extractTextFromDOCX(arrayBuffer) {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
} 