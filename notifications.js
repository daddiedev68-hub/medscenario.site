
// notifications.js - Notification System

let notificationCount = 0;
let notificationInterval = null;

async function loadNotifications() {
    try {
        const response = await fetch(`${API_URL}/api/notifications`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await response.json();
        if (data.success) {
            notificationCount = data.notifications.filter(n => !n.isRead).length;
            updateNotificationBadge();
            return data.notifications;
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
    return [];
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (notificationCount > 0) {
            badge.innerText = notificationCount > 9 ? '9+' : notificationCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

async function markNotificationRead(notificationId) {
    try {
        await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        notificationCount--;
        updateNotificationBadge();
    } catch (error) {
        console.error('Error marking notification read:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        await fetch(`${API_URL}/api/notifications/read-all`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        notificationCount = 0;
        updateNotificationBadge();
    } catch (error) {
        console.error('Error marking all read:', error);
    }
}

function showNotificationToast(title, message) {
    // Create a toast notification
    const toastContainer = document.getElementById('notificationToastContainer');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'notificationToastContainer';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 16px 20px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
        border-left: 4px solid #2563eb;
        min-width: 280px;
        max-width: 350px;
        animation: slideIn 0.3s ease;
        cursor: pointer;
    `;
    toast.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 0.8rem; color: #6b7280;">${message}</div>
    `;
    
    document.getElementById('notificationToastContainer').appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
    
    toast.onclick = () => {
        window.location.href = 'notifications.html';
    };
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Start polling for new notifications
function startNotificationPolling() {
    if (notificationInterval) clearInterval(notificationInterval);
    
    let lastCount = notificationCount;
    
    notificationInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_URL}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const data = await response.json();
            if (data.success) {
                const newCount = data.notifications.filter(n => !n.isRead).length;
                if (newCount > notificationCount) {
                    // New notification arrived
                    const newNotifications = data.notifications.filter(n => !n.isRead);
                    const latest = newNotifications[0];
                    if (latest) {
                        showNotificationToast(latest.title, latest.message);
                    }
                }
                notificationCount = newCount;
                updateNotificationBadge();
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 30000); // Check every 30 seconds
}