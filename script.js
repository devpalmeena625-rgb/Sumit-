// ===== CONFIGURATION =====
const SECRET_KEY = '966080';
const USERS_KEY = 'deepseek_world_users';
const SESSION_KEY = 'deepseek_world_session';
const LOGS_KEY = 'deepseek_access_logs';
let currentUser = null;
let allUsers = [];
let autoRefreshInterval = null;
let deviceId = '';

// ===== INIT =====
function initSystem() {
    try {
        const stored = localStorage.getItem(USERS_KEY);
        allUsers = stored ? JSON.parse(stored) : [];
    } catch(e) {
        allUsers = [];
        localStorage.removeItem(USERS_KEY);
    }
    
    if (!allUsers || allUsers.length === 0) {
        allUsers = [
            {
                id: 'owner_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                username: 'owner',
                password: '966080',
                role: 'owner',
                created: new Date().toISOString(),
                files: [],
                devices: []
            },
            {
                id: 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                username: 'admin',
                password: '772692',
                role: 'admin',
                created: new Date().toISOString(),
                files: [],
                devices: []
            },
            {
                id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                username: 'user',
                password: 'user123',
                role: 'user',
                created: new Date().toISOString(),
                files: [],
                devices: []
            }
        ];
        saveUsers();
    }
    
    deviceId = getDeviceId();
    updateDeviceInfo();
    
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
        try {
            const sessionData = JSON.parse(session);
            const user = allUsers.find(u => u.id === sessionData.userId);
            if (user) {
                currentUser = user;
                trackDevice(user.id);
                showVault();
                return;
            }
        } catch(e) {
            localStorage.removeItem(SESSION_KEY);
        }
    }
}

function getDeviceId() {
    let id = localStorage.getItem('device_id');
    if (!id) {
        id = 'dev_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_id', id);
    }
    return id;
}

function updateDeviceInfo() {
    const info = document.getElementById('deviceInfo');
    if (info) {
        const ua = navigator.userAgent;
        let device = 'Unknown';
        if (ua.includes('Mobile')) device = '📱 Mobile';
        else if (ua.includes('Tablet')) device = '📱 Tablet';
        else if (ua.includes('Windows')) device = '💻 Windows';
        else if (ua.includes('Mac')) device = '💻 Mac';
        else if (ua.includes('Linux')) device = '💻 Linux';
        info.textContent = device + ' | ' + deviceId.substring(0, 8);
    }
}

function trackDevice(userId) {
    const userIndex = allUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        if (!allUsers[userIndex].devices) {
            allUsers[userIndex].devices = [];
        }
        const deviceInfo = {
            id: deviceId,
            userAgent: navigator.userAgent.substring(0, 100),
            lastSeen: new Date().toISOString()
        };
        const existing = allUsers[userIndex].devices.find(d => d.id === deviceId);
        if (!existing) {
            allUsers[userIndex].devices.push(deviceInfo);
            saveUsers();
        } else {
            existing.lastSeen = new Date().toISOString();
            saveUsers();
        }
    }
}

function saveUsers() {
    try {
        localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
    } catch(e) {
        console.error('Save error:', e);
    }
}

// ===== VERIFY SECURITY KEY =====
function verifyKey() {
    const inputKey = document.getElementById('securityKey').value;
    const errorEl = document.getElementById('keyError');
    
    if (inputKey === SECRET_KEY) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('vaultSection').style.display = 'block';
        errorEl.style.display = 'none';
        initSystem();
        logAccess('Security Key Verified', 'success');
    } else {
        errorEl.style.display = 'block';
        document.getElementById('securityKey').value = '';
        logAccess('Failed Security Key Attempt', 'failed');
        setTimeout(() => errorEl.style.display = 'none', 3000);
    }
}

document.getElementById('securityKey').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') verifyKey();
});

function logAccess(action, status) {
    try {
        let logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            action: action,
            status: status,
            device: deviceId,
            userAgent: navigator.userAgent.substring(0, 100)
        });
        if (logs.length > 100) logs = logs.slice(-100);
        localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    } catch(e) {}
}

// ===== SHOW VAULT =====
function showVault() {
    document.getElementById('authSection')?.remove();
    document.getElementById('vaultSection').style.display = 'block';
    document.getElementById('currentUser').textContent = currentUser.username;
    
    const roleSpan = document.getElementById('userRole');
    if (currentUser.role === 'owner') {
        roleSpan.textContent = '[👑 OWNER]';
        roleSpan.style.color = '#ff0040';
        roleSpan.style.background = 'rgba(255,0,64,0.2)';
        roleSpan.style.padding = '3px 10px';
        roleSpan.style.borderRadius = '5px';
        document.getElementById('ownerPanel').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
        refreshOwnerPanel();
    } else if (currentUser.role === 'admin') {
        roleSpan.textContent = '[🔱 ADMIN]';
        roleSpan.style.color = '#ffd700';
        roleSpan.style.background = 'rgba(255,215,0,0.2)';
        roleSpan.style.padding = '3px 10px';
        roleSpan.style.borderRadius = '5px';
        document.getElementById('ownerPanel').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        refreshAdminPanel();
    } else {
        roleSpan.textContent = '[👤 USER]';
        roleSpan.style.color = '#00ff41';
        roleSpan.style.background = 'rgba(0,255,65,0.2)';
        roleSpan.style.padding = '3px 10px';
        roleSpan.style.borderRadius = '5px';
        document.getElementById('ownerPanel').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'none';
    }
    
    loadUserFiles();
    
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    autoRefreshInterval = setInterval(() => {
        if (currentUser) {
            loadUserFiles();
            if (currentUser.role === 'owner') refreshOwnerPanel();
            if (currentUser.role === 'admin') refreshAdminPanel();
        }
    }, 15000);
}

// ===== USER LOGOUT =====
function userLogout() {
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    location.reload();
}

// ===== CHANGE PASSWORD =====
function changePassword() {
    const newPass = prompt('Enter new password (min 4 characters):');
    if (!newPass) return;
    
    if (newPass.length < 4) {
        alert('❌ Password must be at least 4 characters!');
        return;
    }
    
    const confirmPass = prompt('Confirm new password:');
    if (newPass !== confirmPass) {
        alert('❌ Passwords do not match!');
        return;
    }
    
    const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        allUsers[userIndex].password = newPass;
        saveUsers();
        currentUser.password = newPass;
        alert('✅ Password changed successfully!');
        logAccess('Password Changed', 'success');
    }
}

// ===== CHANGE SECURITY KEY =====
function changeSecurityKey() {
    if (currentUser.role !== 'owner') {
        alert('❌ Only Owner can change security key!');
        return;
    }
    
    const newKey = prompt('Enter new 6-digit security key:');
    if (!newKey) return;
    
    if (newKey.length !== 6 || !/^\d+$/.test(newKey)) {
        alert('❌ Security key must be exactly 6 digits!');
        return;
    }
    
    const confirmKey = prompt('Confirm new 6-digit security key:');
    if (newKey !== confirmKey) {
        alert('❌ Keys do not match!');
        return;
    }
    
    // Update all users' passwords if they match old key
    allUsers.forEach(u => {
        if (u.password === '966080') u.password = newKey;
    });
    saveUsers();
    alert('✅ Security key changed to: ' + newKey);
    logAccess('Security Key Changed', 'success');
}

// ===== CREATE ADMIN =====
function createAdmin() {
    if (currentUser.role !== 'owner') {
        alert('❌ Only Owner can make admins!');
        return;
    }
    
    const username = prompt('Enter username to make admin:');
    if (!username) return;
    
    const user = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
        alert('❌ User not found!');
        return;
    }
    
    if (user.role === 'owner') {
        alert('❌ Cannot demote Owner!');
        return;
    }
    
    if (user.role === 'admin') {
        alert('❌ User is already an Admin!');
        return;
    }
    
    user.role = 'admin';
    saveUsers();
    refreshOwnerPanel();
    alert('✅ ' + user.username + ' is now an Admin!');
    logAccess('Admin Created: ' + user.username, 'success');
}

// ===== UPLOAD FILES =====
async function uploadFiles() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    
    if (files.length === 0) {
        alert('⚠️ Pehle koi file select kar!');
        return;
    }

    let uploaded = 0;
    const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) {
        alert('❌ User not found!');
        return;
    }
    
    for (let file of files) {
        try {
            const base64 = await fileToBase64(file);
            const fileData = {
                id: 'f_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
                name: file.name,
                size: file.size,
                type: file.type,
                data: base64,
                uploaded: new Date().toISOString(),
                fileType: getFileType(file.name),
                device: deviceId
            };
            
            allUsers[userIndex].files.push(fileData);
            uploaded++;
        } catch(err) {
            console.error('Upload error for', file.name, err);
        }
    }
    
    saveUsers();
    fileInput.value = '';
    loadUserFiles();
    if (currentUser.role === 'owner') refreshOwnerPanel();
    if (currentUser.role === 'admin') refreshAdminPanel();
    alert('✅ ' + uploaded + ' files uploaded successfully!');
    logAccess('Uploaded ' + uploaded + ' files', 'success');
}

function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','gif','webp','svg','bmp','ico'].includes(ext)) return 'image';
    if (['mp4','avi','mov','mkv','webm','flv','wmv'].includes(ext)) return 'video';
    if (['mp3','wav','aac','ogg','flac','m4a'].includes(ext)) return 'audio';
    if (['zip','rar','7z','tar','gz'].includes(ext)) return 'archive';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['txt','doc','docx','xls','xlsx','ppt','pptx','odt','ods'].includes(ext)) return 'document';
    return 'other';
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// ===== LOAD USER FILES =====
function loadUserFiles() {
    const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return;
    
    const files = allUsers[userIndex].files || [];
    displayUserFiles(files);
    updateUserStats(files);
}

function displayUserFiles(files) {
    const fileList = document.getElementById('fileList');
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    
    let filtered = files;
    if (searchTerm) {
        filtered = filtered.filter(f => f.name.toLowerCase().includes(searchTerm));
    }
    
    if (filtered.length === 0) {
        fileList.innerHTML = '<p style="color:#666; grid-column:1/-1; text-align:center; padding:30px;">📭 No files found</p>';
        return;
    }
    
    let html = '';
    filtered.forEach((file) => {
        const sizeDisplay = file.size > 1024*1024 ? 
            (file.size/(1024*1024)).toFixed(2) + ' MB' : 
            (file.size/1024).toFixed(1) + ' KB';
        
        const isImage = file.fileType === 'image';
        const date = new Date(file.uploaded).toLocaleString();
        
        let previewHtml = '';
        if (isImage && file.data) {
            previewHtml = `<img src="${file.data}" alt="${file.name}" loading="lazy" onerror="this.style.display='none'">`;
        } else if (file.fileType === 'video' && file.data) {
            previewHtml = `<video src="${file.data}" controls style="max-width:100%;max-height:100%;"></video>`;
        } else if (file.fileType === 'audio' && file.data) {
            previewHtml = `<audio src="${file.data}" controls style="width:100%;"></audio>`;
        } else {
            previewHtml = `<div class="file-icon">${getFileIcon(file.fileType)}</div>`;
        }

        html += `
            <div class="file-card">
                <div class="file-preview">${previewHtml}</div>
                <div class="file-name" title="${file.name}">${file.name}</div>
                <div class="file-meta">${sizeDisplay} | ${date}</div>
                <div class="file-actions">
                    <button class="download-btn" onclick="downloadUserFile('${file.id}')">⬇ DOWNLOAD</button>
                    <button class="share-btn" onclick="shareUserFile('${file.id}')">🔗 SHARE</button>
                    <button class="delete-btn" onclick="deleteUserFile('${file.id}')">🗑</button>
                </div>
            </div>
        `;
    });

    fileList.innerHTML = html;
}

function getFileIcon(type) {
    const icons = {
        'image': '🖼️',
        'video': '🎬',
        'audio': '🎵',
        'archive': '📦',
        'pdf': '📄',
        'document': '📝',
        'other': '📁'
    };
    return icons[type] || '📁';
}

function searchFiles() {
    loadUserFiles();
}

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            loadUserFiles();
        });
    }
});

// ===== DOWNLOAD =====
function downloadUserFile(fileId) {
    const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return;
    
    const file = allUsers[userIndex].files.find(f => f.id === fileId);
    if (!file) {
        alert('❌ File not found!');
        return;
    }
    
    try {
        const link = document.createElement('a');
        link.href = file.data;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        logAccess('Downloaded: ' + file.name, 'success');
    } catch(e) {
        alert('❌ Download failed: ' + e.message);
    }
}

// ===== SHARE =====
function shareUserFile(fileId) {
    const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return;
    
    const file = allUsers[userIndex].files.find(f => f.id === fileId);
    if (!file) {
        alert('❌ File not found!');
        return;
    }
    
    const shareData = {
        id: file.id,
        name: file.name,
        data: file.data
    };
    
    try {
        const encoded = btoa(JSON.stringify(shareData));
        const url = window.location.href.split('?')[0] + '?share=' + encoded;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                alert('✅ Share link copied to clipboard!\n' + url);
            }).catch(() => {
                prompt('📋 Copy this link:', url);
            });
        } else {
            prompt('📋 Copy this link:', url);
        }
        logAccess('Shared: ' + file.name, 'success');
    } catch(e) {
        alert('❌ Share failed: ' + e.message);
    }
}

// ===== DELETE =====
function deleteUserFile(fileId) {
    if (!confirm('⚠️ Delete this file permanently?')) return;
    
    const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return;
    
    allUsers[userIndex].files = allUsers[userIndex].files.filter(f => f.id !== fileId);
    saveUsers();
    loadUserFiles();
    if (currentUser.role === 'owner') refreshOwnerPanel();
    if (currentUser.role === 'admin') refreshAdminPanel();
    logAccess('Deleted file', 'success');
}

// ===== UPDATE STATS =====
function updateUserStats(files) {
    document.getElementById('myFiles').textContent = files.length;
    
    let totalSize = 0, images = 0, zips = 0;
    files.forEach(f => {
        totalSize += f.size || 0;
        if (f.fileType === 'image') images++;
        if (f.fileType === 'archive') zips++;
    });
    
    document.getElementById('mySize').textContent = (totalSize/(1024*1024)).toFixed(2) + ' MB';
    document.getElementById('myImages').textContent = images;
    document.getElementById('myZips').textContent = zips;
}

// ===== OWNER PANEL =====
function refreshOwnerPanel() {
    if (currentUser.role !== 'owner') return;
    
    const totalUsers = allUsers.length;
    let allFiles = 0;
    let totalSize = 0;
    let adminCount = 0;
    let totalDevices = 0;
    
    allUsers.forEach(u => {
        allFiles += (u.files || []).length;
        (u.files || []).forEach(f => totalSize += f.size || 0);
        if (u.role === 'admin') adminCount++;
        if (u.devices) totalDevices += u.devices.length;
    });
    
    document.getElementById('ownerTotalUsers').textContent = totalUsers;
    document.getElementById('ownerAllFiles').textContent = allFiles;
    document.getElementById('ownerTotalStorage').textContent = (totalSize/(1024*1024)).toFixed(2) + ' MB';
    document.getElementById('ownerAdminCount').textContent = adminCount;
    document.getElementById('ownerDevices').textContent = totalDevices || 1;
    
    const userList = document.getElementById('ownerUserList');
    if (!userList) return;
    
    let html = '<table style="width:100%; color:#00ff41; border-collapse:collapse;">';
    html += '<tr style="border-bottom:2px solid #ff0040;"><th style="text-align:left; padding:8px;">User</th><th style="text-align:left; padding:8px;">Role</th><th style="text-align:left; padding:8px;">Files</th><th style="text-align:left; padding:8px;">Size</th><th style="text-align:left; padding:8px;">Devices</th><th style="text-align:left; padding:8px;">Actions</th></tr>';
    
    allUsers.forEach(u => {
        const userSize = (u.files || []).reduce((sum, f) => sum + (f.size || 0), 0);
        const roleColor = u.role === 'owner' ? '#ff0040' : u.role === 'admin' ? '#ffd700' : '#00ff41';
        const roleIcon = u.role === 'owner' ? '👑' : u.role === 'admin' ? '🔱' : '👤';
        const deviceCount = (u.devices || []).length || 1;
        
        html += `
            <tr style="border-bottom:1px solid #333;">
                <td style="padding:8px; color:${roleColor};">${roleIcon} ${u.username}</td>
                <td style="padding:8px; color:${roleColor};">${u.role.toUpperCase()}</td>
                <td style="padding:8px;">${(u.files || []).length}</td>
                <td style="padding:8px;">${(userSize/(1024*1024)).toFixed(2)} MB</td>
                <td style="padding:8px;">${deviceCount}</td>
                <td style="padding:8px;">
                    <button onclick="ownerViewFiles('${u.id}')" style="background:#00ccff; color:#000; border:none; border-radius:3px; padding:3px 10px; cursor:pointer;">👁️ View</button>
                    ${u.id !== currentUser.id ? `
                        <button onclick="ownerDeleteUser('${u.id}')" style="background:#ff0040; color:#fff; border:none; border-radius:3px; padding:3px 10px; cursor:pointer;">🗑️</button>
                        <button onclick="ownerViewDevices('${u.id}')" style="background:#ff8800; color:#000; border:none; border-radius:3px; padding:3px 10px; cursor:pointer;">📱</button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
    
    html += '</table>';
    userList.innerHTML = html;
}

function ownerViewDevices(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        alert('❌ User not found!');
        return;
    }
    
    const devices = user.devices || [];
    if (devices.length === 0) {
        alert('📱 ' + user.username + ' has no registered devices');
        return;
    }
    
    let message = '📱 ' + user.username + '\'s Devices (' + devices.length + '):\n\n';
    devices.forEach((d, i) => {
        message += `${i+1}. Device: ${d.id.substring(0, 12)}...\n`;
        message += `   Last Seen: ${new Date(d.lastSeen).toLocaleString()}\n`;
        message += `   UserAgent: ${d.userAgent.substring(0, 50)}...\n\n`;
    });
    alert(message);
}

function ownerViewFiles(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        alert('❌ User not found!');
        return;
    }
    
    const files = user.files || [];
    if (files.length === 0) {
        alert('📭 ' + user.username + ' has no files!');
        return;
    }
    
    let message = '📂 ' + user.username + '\'s Files (' + files.length + '):\n\n';
    files.forEach((f, i) => {
        const size = f.size > 1024*1024 ? 
            (f.size/(1024*1024)).toFixed(2) + ' MB' : 
            (f.size/1024).toFixed(1) + ' KB';
        const date = new Date(f.uploaded).toLocaleDateString();
        message += `${i+1}. ${f.name} (${size}) - ${date}\n`;
    });
    alert(message);
}

function ownerDeleteUser(userId) {
    if (!confirm('⚠️ Delete this user and all their data?')) return;
    if (!confirm('⚠️ This cannot be undone! Are you sure?')) return;
    
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        alert('❌ User not found!');
        return;
    }
    
    if (user.role === 'owner') {
        alert('❌ Cannot delete Owner!');
        return;
    }
    
    allUsers = allUsers.filter(u => u.id !== userId);
    saveUsers();
    refreshOwnerPanel();
    alert('✅ User ' + user.username + ' deleted!');
    logAccess('User Deleted: ' + user.username, 'success');
}

// ===== ADMIN PANEL =====
function refreshAdminPanel() {
    if (currentUser.role !== 'admin' && currentUser.role !== 'owner') return;
    
    const totalUsers = allUsers.length;
    let allFiles = 0;
    let totalSize = 0;
    
    allUsers.forEach(u => {
        allFiles += (u.files || []).length;
        (u.files || []).forEach(f => totalSize += f.size || 0);
    });
    
    document.getElementById('adminTotalUsers').textContent = totalUsers;
    document.getElementById('adminAllFiles').textContent = allFiles;
    document.getElementById('adminTotalStorage').textContent = (totalSize/(1024*1024)).toFixed(2) + ' MB';
    
    const userList = document.getElementById('adminUserList');
    if (!userList) return;
    
    let html = '<table style="width:100%; color:#00ff41; border-collapse:collapse;">';
    html += '<tr style="border-bottom:2px solid #ffd700;"><th style="text-align:left; padding:8px;">User</th><th style="text-align:left; padding:8px;">Files</th><th style="text-align:left; padding:8px;">Size</th><th style="text-align:left; padding:8px;">Actions</th></tr>';
    
    allUsers.forEach(u => {
        if (u.role === 'owner') return;
        const userSize = (u.files || []).reduce((sum, f) => sum + (f.size || 0), 0);
        html += `
            <tr style="border-bottom:1px solid #333;">
                <td style="padding:8px;">${u.username}</td>
                <td style="padding:8px;">${(u.files || []).length}</td>
                <td style="padding:8px;">${(userSize/(1024*1024)).toFixed(2)} MB</td>
                <td style="padding:8px;">
                    <button onclick="adminViewFiles('${u.id}')" style="background:#00ccff; color:#000; border:none; border-radius:3px; padding:3px 10px; cursor:pointer;">👁️ View</button>
                </td>
            </tr>
        `;
    });
    
    html += '</table>';
    userList.innerHTML = html;
}

function adminViewFiles(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        alert('❌ User not found!');
        return;
    }
    
    const files = user.files || [];
    if (files.length === 0) {
        alert('📭 ' + user.username + ' has no files!');
        return;
    }
    
    let message = '📂 ' + user.username + '\'s Files:\n\n';
    files.forEach((f, i) => {
        const size = f.size > 1024*1024 ? 
            (f.size/(1024*1024)).toFixed(2) + ' MB' : 
            (f.size/1024).toFixed(1) + ' KB';
        message += `${i+1}. ${f.name} (${size})\n`;
    });
    alert(message);
}

// ===== EXPORT =====
function exportAllData() {
    if (currentUser.role !== 'owner') {
        alert('❌ Only Owner can export all data!');
        return;
    }
    
    try {
        const data = JSON.stringify(allUsers, null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'world_vault_data_' + new Date().toISOString().slice(0,10) + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert('✅ All data exported successfully!');
        logAccess('Data Export', 'success');
    } catch(e) {
        alert('❌ Export failed: ' + e.message);
    }
}

function exportUserData() {
    if (currentUser.role !== 'admin' && currentUser.role !== 'owner') {
        alert('❌ Only Admin/Owner can export!');
        return;
    }
    
    try {
        const data = JSON.stringify(allUsers.filter(u => u.role !== 'owner'), null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'users_data_' + new Date().toISOString().slice(0,10) + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert('✅ User data exported successfully!');
    } catch(e) {
        alert('❌ Export failed: ' + e.message);
    }
}

// ===== CLEAR ALL =====
function clearAllData() {
    if (currentUser.role !== 'owner') {
        alert('❌ Only Owner can purge all data!');
        return;
    }
    
    if (!confirm('⚠️ DELETE ALL USERS AND DATA? Triple confirm?')) return;
    if (!confirm('⚠️ This will delete EVERYTHING! Confirm?')) return;
    if (!confirm('⚠️ Final warning! Are you absolutely sure?')) return;
    
    const owner = allUsers.find(u => u.role === 'owner');
    allUsers = [owner];
    saveUsers();
    localStorage.removeItem(SESSION_KEY);
    alert('🗑️ All data purged! Only Owner remains.');
    logAccess('Data Purge', 'success');
    location.reload();
}

// ===== SHARE LINK HANDLER =====
window.onload = function() {
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    if (shareData) {
        try {
            const decoded = JSON.parse(atob(shareData));
            if (decoded && decoded.data && decoded.id) {
                localStorage.setItem('shared_file_' + decoded.id, JSON.stringify(decoded));
                alert('📥 Shared file ready to download: ' + decoded.name);
            }
        } catch(e) {
            console.log('Invalid share link');
        }
    }
};