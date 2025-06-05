// UI Elements
const progressBar = document.getElementById('progress');
const filePreview = document.getElementById('filePreview');
const fileInfo = document.getElementById('fileInfo');
const statusDiv = document.getElementById('fileStatus');
const uploadButton = document.getElementById('uploadButton');

// OpenAI API configuration
const OPENAI_API_KEY = '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';
const OPENAI_MODEL = 'gpt-4';

// Initialize OpenAI client
const openai = {
    async generate(text, systemPrompt) {
        try {
            console.log('Generating content with text:', text.substring(0, 50) + '...');
            console.log('System prompt:', systemPrompt);
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: OPENAI_MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: text }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log('API Response:', data);
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                throw new Error('Invalid API response format');
            }
            
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Detailed error:', error);
            console.error('Error stack:', error.stack);
            throw new Error('Error generating content. Please check your API key and try again.');
        }
    }
};

// Loading state management
let isLoading = false;

// Constants for file handling
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_TYPES = [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

function setLoading(isLoading) {
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = isLoading;
    generateBtn.textContent = isLoading ? "Generating..." : "⚡ Generate Quiz & Notes";
}

// File upload handling
document.getElementById('fileInput').addEventListener('change', async (e) => {
    try {
        const file = e.target.files[0];
        if (!file) return;

        // Reset UI
        progressBar.style.width = '0%';
        filePreview.textContent = '';
        fileInfo.textContent = '';
        statusDiv.textContent = '';

        // Validate file
        if (!SUPPORTED_TYPES.includes(file.type)) {
            throw new Error(`Unsupported file type. Please upload a text, PDF, or Word document.`);
        }

        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File too large. Please upload a file smaller than 5MB.`);
        }

        // Show file info
        fileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

        // Start reading
        statusDiv.textContent = 'Processing file...';
        uploadButton.disabled = true;

        // Read file with progress
        const text = await readFileWithProgress(file);
        
        // Update UI
        document.getElementById('inputText').value = text;
        filePreview.textContent = text.substring(0, 200) + (text.length > 200 ? '...' : '');
        statusDiv.textContent = 'File processed successfully';
        uploadButton.disabled = false;

    } catch (error) {
        console.error('Error:', error);
        statusDiv.textContent = `Error: ${error.message}`;
        uploadButton.disabled = false;
        alert(error.message);
    }
});

// Helper function to read file with progress
async function readFileWithProgress(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        let loaded = 0;
        
        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                const progress = (e.loaded / e.total) * 100;
                progressBar.style.width = `${progress}%`;
                statusDiv.textContent = `Processing ${Math.round(progress)}%`;
            }
        };

        reader.onloadstart = () => {
            loaded = 0;
            statusDiv.textContent = 'Starting file processing...';
        };

        reader.onload = async (e) => {
            const arrayBuffer = e.target.result;
            
            if (file.name.toLowerCase().endsWith('.docx')) {
                try {
                    statusDiv.textContent = 'Converting Word document to text...';
                    const result = await mammoth.convertToHtml({
                        arrayBuffer: arrayBuffer,
                        convertImage: mammoth.images.imgElement({
                            style: 'width:100%;'
                        })
                    });
                    
                    // Clean up HTML and extract text
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(result.value, 'text/html');
                    const text = doc.body.textContent || '';
                    resolve(text.trim());
                } catch (error) {
                    console.error('Word document processing error:', error);
                    reject(new Error('Failed to process Word document. Please ensure it is a valid .docx file.'));
                }
            } else if (file.name.toLowerCase().endsWith('.pdf')) {
                reject(new Error('PDF processing is not currently supported. Please convert to text first.'));
            } else {
                // For text files, convert ArrayBuffer to string
                const decoder = new TextDecoder();
                const text = decoder.decode(arrayBuffer).trim();
                resolve(text);
            }
        };

        reader.onerror = (e) => {
            console.error('File reading error:', e);
            reject(new Error('Failed to read file. Please try again.'));
        };

        reader.readAsArrayBuffer(file);
    });
}

// Text processing functions
function formatText(text) {
    return text.trim().replace(/\n\s*\n/g, '\n\n');
}

function cleanText(text) {
    return text.trim().replace(/\s+/g, ' ');
}

function displaySummary(text) {
    const summaryEl = document.getElementById('summary');
    summaryEl.textContent = text;
}

function formatKeyPoints(text) {
    // Extract exactly 5 key points with bullet points
    const points = text.split(/\n|•|-/).filter(Boolean).slice(0, 5);
    return points.map(point => `• ${point.trim()}`).join('\n');
}

function formatKeyPoints(text) {
    // Extract exactly 5 key points with bullet points
    const points = text.split(/\n|•|-/).filter(Boolean).slice(0, 5);
    return points.map(point => `• ${point.trim()}`).join('\n');
}

function formatMCQs(text) {
    // Split into questions and format each one
    const questions = text.split('\n\n').filter(Boolean);
    return questions.map(q => {
        const parts = q.split('\n');
        const question = parts[0].replace(/^Question:\s*/, '');
        const options = parts.slice(1).map(opt => opt.trim());
        return `
            <div class="question">
                <div class="question-text">${question}</div>
                <ul class="options">
                    ${options.map(opt => `<li>${opt}</li>`).join('')}
                </ul>
            </div>
        `;
    }).join('');
}

function formatBlanks(text) {
    const blanks = text.split('\n').filter(Boolean);
    return blanks.map(blank => {
        const parts = blank.split('(');
        const question = parts[0].trim();
        const answer = parts[1]?.split(')')[0]?.trim() || '';
        return `
            <div class="blank">
                <div class="blank-text">${question}</div>
                <input type="text" class="blank-input" placeholder="Type your answer...">
                <div class="blank-answer">Answer: ${answer}</div>
            </div>
        `;
    }).join('');
}

function displayKeyPoints(text) {
    const list = document.getElementById('keyPoints');
    list.innerHTML = text;
}

function displayMCQs(formattedMCQs) {
    const container = document.getElementById('mcqs');
    container.innerHTML = formattedMCQs;
}

function displayBlanks(formattedBlanks) {
    const container = document.getElementById('blanks');
    container.innerHTML = formattedBlanks;
}

// Main content generation
async function generateContent() {
    try {
        const text = document.getElementById('inputText').value.trim();
        if (!text) {
            alert('Please paste or enter some article text first.');
            return;
        }

        console.log('Starting content generation with text:', text.substring(0, 100));
        setLoading(true);

        // Configure prompts for OpenAI
        const systemPrompts = {
            summary: "You are an expert summarizer. Create a concise summary of this text in 4-5 sentences.\n" +
                     "Focus on the most important points and maintain clarity.\n\n",

            keyPoints: "You are an expert analyst. Extract exactly 5 key points from this text.\n" +
                       "Each key point should:\n" +
                       "1. Be a complete, well-structured sentence\n" +
                       "2. Start with a clear topic or concept\n" +
                       "3. Include specific details or examples\n" +
                       "4. Be unique and not overlap with other points\n" +
                       "5. Use bullet points with numbers for clarity\n" +
                       "Example format:\n" +
                       "1. First key concept: Detailed explanation with specific details\n" +
                       "2. Second key concept: Clear explanation with examples\n\n",

            mcq: "You are an expert educator. Create exactly 5 multiple choice questions from this text.\n" +
                  "Each question must follow this exact format:\n" +
                  "Question: [Question text]\n" +
                  "A. [Option A]\n" +
                  "B. [Option B]\n" +
                  "C. [Option C]\n" +
                  "D. [Option D] [Correct]\n\n" +
                  "Ensure each question:\n" +
                  "1. Has exactly 4 options (A, B, C, D)\n" +
                  "2. Has clear question statement\n" +
                  "3. Has one correct answer marked with [Correct]\n" +
                  "4. Has distractors that are related but incorrect\n" +
                  "5. Tests deep understanding of the concepts\n\n",

            blanks: "You are an expert educator. Create exactly 5 fill-in-the-blank questions from this text.\n" +
                    "Each question must follow this exact format:\n" +
                    "[Sentence with ___ for blank] (answer)\n\n" +
                    "Ensure each question:\n" +
                    "1. Replaces key terms with underscores (___)\n" +
                    "2. Includes the correct answer in parentheses\n" +
                    "3. Tests understanding of main concepts\n\n"
        };

        // Generate content using OpenAI
        try {
            console.log('Generating summary...');
            const summary = await openai.generate(text, systemPrompts.summary);
            console.log('Summary generated:', summary.substring(0, 100));

            console.log('Generating key points...');
            const keyPoints = await openai.generate(text, systemPrompts.keyPoints);
            console.log('Key points generated:', keyPoints.substring(0, 100));

            console.log('Generating MCQs...');
            const mcqs = await openai.generate(text, systemPrompts.mcq);
            console.log('MCQs generated:', mcqs.substring(0, 100));

            console.log('Generating blanks...');
            const blanks = await openai.generate(text, systemPrompts.blanks);
            console.log('Blanks generated:', blanks.substring(0, 100));

            // Validate and format outputs
            const formattedKeyPoints = formatKeyPoints(keyPoints);
            const formattedMCQs = formatMCQs(mcqs);
            const formattedBlanks = formatBlanks(blanks);

            // Format and display results
            displaySummary(formatText(summary));
            displayKeyPoints(formattedKeyPoints);
            displayMCQs(formattedMCQs);
            displayBlanks(formattedBlanks);

        } catch (err) {
            console.error('Error in content generation:', err);
            alert('Error generating content: ' + err.message);
        } finally {
            setLoading(false);
        }
    } catch (err) {
        console.error('Detailed error:', err);
        alert('Error generating content: ' + err.message);
        setLoading(false);
    }
}

// PDF Export
async function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'pt', 'a4');
        const element = document.querySelector('.output');

        // Convert HTML to canvas
        const canvas = await html2canvas(element, { 
            scale: 2,
            logging: true,
            useCORS: true
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        // Add title page
        pdf.addPage();
        pdf.setFontSize(24);
        pdf.text('QuizCraft Output', pdfWidth / 2, 50, { align: 'center' });
        pdf.setFontSize(12);
        pdf.text('Generated on: ' + new Date().toLocaleDateString(), pdfWidth / 2, 80, { align: 'center' });

        // Add content page
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        pdf.save('QuizCraft_Output.pdf');
    } catch (err) {
        console.error('PDF export error:', err);
        alert('Error exporting PDF: ' + err.message);
    }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('generateBtn').addEventListener('click', generateContent);
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
    
    // Initialize file input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
});
