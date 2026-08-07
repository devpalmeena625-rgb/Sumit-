const SECRET_KEY = '9660';
let currentFiles = [];

// Verify Security Key
function verifyKey() {
    const inputKey = document.getElementById('securityKey').value;
    const errorEl = document.getElementById('keyError');
    
    if (inputKey === SECRET_KEY) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('vaultSection').style.display = 'block';
        errorEl.style.display = 'none';
        loadFiles();
    } else {
        errorEl.style.display = 'block';
        document.getElementById('securityKey').value = '';
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 3000);
    }
}

// Allow Enter key for login
document.getElementById('securityKey').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        verifyKey();
    }
});

// Upload File (ZIP or Image)
function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('⚠️ Bhai, pehle koi file select kar!');
        return;
    }
    
    // Check if ZIP or Image
    const isZip = file.name.endsWith('.zip');
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(file.name);
    
    if (!isZip && !isImage) {
        alert('⚠️ Sirf ZIP ya Image files allowed hain!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const fileData = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            name: file.name,
            type: isZip ? 'zip' : 'image',
            size: file.size,
            data: e.target.result,
            uploaded: new Date().toISOString()
        };
        
        // Save to localStorage
        let files = JSON.parse(localStorage.getItem('vaultStorage') || '[]');
        files.push(fileData);
        localStorage.setItem('vaultStorage', JSON.stringify(files));
        
        fileInput.value = '';
        loadFiles();
        
        const fileType = isZip ? 'ZIP' : 'Image';
        alert(`✅ ${fileType} file upload ho gayi!`);
    };
    reader.readAsDataURL(file);
}

// Load and Display Files
function loadFiles() {
    const fileList = document.getElementById('fileList');
    const files = JSON.parse(localStorage.getItem('vaultStorage') || '[]');
    
    if (files.length === 0) {
        fileList.innerHTML = '<p style="color: #666; grid-column: 1/-1; text-align: center;">📭 Abhi koi file stored nahi hai</p>';
        return;
    }
    
    let html = '';
    files.forEach((file, index) => {
        const sizeKB = (file.size / 1024).toFixed(1);
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const sizeDisplay = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
        const date = new Date(file.uploaded).toLocaleString();
        const isImage = file.type === 'image';
        
        let previewHtml = '';
        if (isImage) {
            previewHtml = `<img src="${file.data}" alt="${file.name}">`;
        } else {
            previewHtml = `<div class="file-icon">📦</div>`;
        }
        
        html += `
            <div class="file-card">
                <div class="file-preview">
                    ${previewHtml}
                </div>
                <div class="file-name">${file.name}</div>
                <div class="file-meta">${sizeDisplay} | ${date}</div>
                <div class="file-actions">
                    <button class="download-btn" onclick="downloadFile('${file.id}')">⬇ DOWNLOAD</button>
                    <button class="delete-btn" onclick="deleteFile('${file.id}')">🗑 DELETE</button>
                </div>
            </div>
        `;
    });
    fileList.innerHTML = html;
}

// Download File
function downloadFile(fileId) {
    const files = JSON.parse(localStorage.getItem('vaultStorage') || '[]');
    const file = files.find(f => f.id === fileId);
    
    if (!file) {
        alert('❌ File nahi mili!');
        return;
    }
    
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Delete File
function deleteFile(fileId) {
    if (!confirm('⚠️ Pakka delete karna hai? Ye action undo nahi ho sakta!')) {
        return;
    }
    
    let files = JSON.parse(localStorage.getItem('vaultStorage') || '[]');
    files = files.filter(f => f.id !== fileId);
    localStorage.setItem('vaultStorage', JSON.stringify(files));
    loadFiles();
    alert('🗑️ File delete ho gayi!');
}

// Auto-load on page load
window.onload = function() {
    document.getElementById('securityKey').focus();
};