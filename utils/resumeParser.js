"use client";

// No static imports, only dynamic
let pdfjsLib = null;
let mammoth = null;

// Function to dynamically load dependencies
async function loadDependencies() {
  if (typeof window === 'undefined') return false;
  
  try {
    if (!pdfjsLib) {
      const pdfjs = await import('pdfjs-dist/build/pdf');
      pdfjsLib = pdfjs;
      
      // Configure PDF.js worker
      const workerUrl = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    }
    
    if (!mammoth) {
      mammoth = await import('mammoth');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to load parser dependencies:', error);
    return false;
  }
}

export async function extractTextFromFile(file) {
  // Safety check for server-side rendering
  if (typeof window === 'undefined') {
    console.warn('Attempted to extract text from file on server side');
    return '';
  }

  // Load dependencies first
  const loaded = await loadDependencies();
  if (!loaded) {
    throw new Error('Failed to load document parsing dependencies');
  }

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
  if (!pdfjsLib) return '';

  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

async function extractTextFromDOCX(arrayBuffer) {
  if (!mammoth) return '';

  try {
    const result = await mammoth.default.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    return '';
  }
} 