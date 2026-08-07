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

// Upload ZIP File
function uploadZip() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('⚠️ Bhai, pehle koi ZIP file select kar!');
        return;
    }
    
    if (!file.name.endsWith('.zip')) {
        alert('⚠️ Sirf ZIP files allowed hain!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const fileData = {
            name: file.name,
            size: file.size,
            data: e.target.result,
            uploaded: new Date().toISOString()
        };
        
        // Save to localStorage
        let zips = JSON.parse(localStorage.getItem('zipStorage') || '[]');
        zips.push(fileData);
        localStorage.setItem('zipStorage', JSON.stringify(zips));
        
        fileInput.value = '';
        loadFiles();
        alert('✅ ZIP file upload ho gayi!');
    };
    reader.readAsDataURL(file);
}

// Load and Display Files
function loadFiles() {
    const fileList = document.getElementById('fileList');
    const zips = JSON.parse(localStorage.getItem('zipStorage') || '[]');
    
    if (zips.length === 0) {
        fileList.innerHTML = '<p style="color: #666;">📭 Abhi koi ZIP file stored nahi hai</p>';
        return;
    }
    
    let html = '';
    zips.forEach((zip, index) => {
        const sizeKB = (zip.size / 1024).toFixed(1);
        const date = new Date(zip.uploaded).toLocaleString();
        html += `
            <div class="file-item">
                <div>
                    <span class="file-name">📦 ${zip.name}</span>
                    <span style="color: #666; font-size: 0.8em; margin-left: 15px;">
                        ${sizeKB} KB | ${date}
                    </span>
                </div>
                <div class="file-actions">
                    <button class="download-btn" onclick="downloadZip(${index})">⬇ DOWNLOAD</button>
                    <button class="delete-btn" onclick="deleteZip(${index})">🗑 DELETE</button>
                </div>
            </div>
        `;
    });
    fileList.innerHTML = html;
}

// Download ZIP File
function downloadZip(index) {
    const zips = JSON.parse(localStorage.getItem('zipStorage') || '[]');
    if (index >= zips.length) {
        alert('❌ File nahi mili!');
        return;
    }
    
    const zip = zips[index];
    const link = document.createElement('a');
    link.href = zip.data;
    link.download = zip.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Delete ZIP File
function deleteZip(index) {
    if (!confirm('⚠️ Pakka delete karna hai? Ye action undo nahi ho sakta!')) {
        return;
    }
    
    let zips = JSON.parse(localStorage.getItem('zipStorage') || '[]');
    zips.splice(index, 1);
    localStorage.setItem('zipStorage', JSON.stringify(zips));
    loadFiles();
    alert('🗑️ ZIP file delete ho gayi!');
}

// Auto-load on page load
window.onload = function() {
    document.getElementById('securityKey').focus();
};