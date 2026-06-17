// --- SYNC SCHEDULING FUNCTIONS ---

// Get time until next event (in milliseconds)
function getTimeUntilNextMidnight() {
    const taiwanTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const tomorrow = new Date(taiwanTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return tomorrow.getTime() - taiwanTime.getTime();
}

function getTimeUntil6AM() {
    const taiwanTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const target = new Date(taiwanTime);
    target.setHours(6, 0, 0, 0);
    
    if (target.getTime() <= taiwanTime.getTime()) {
        // If it's already past 6 AM, set for tomorrow
        target.setDate(target.getDate() + 1);
    }
    
    return target.getTime() - taiwanTime.getTime();
}
