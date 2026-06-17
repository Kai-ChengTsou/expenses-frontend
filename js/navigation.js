// Function to initialize sections
function initializeSections() {
    // Hide all sections except the active one
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        if (!section.classList.contains('active')) {
            section.style.display = 'none';
        }
    });
}

// Handle bottom navigation
function setupNavigation() {
    try {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.section');
        
        if (!navItems || navItems.length === 0) {
            console.warn('No nav items found');
            return;
        }
        
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                try {
                    e.preventDefault();
                    
                    // Remove active class from all nav items
                    navItems.forEach(navItem => {
                        navItem.classList.remove('active');
                    });
                    
                    // Add active class to clicked nav item
                    this.classList.add('active');
                    
                    // Add ripple effect
                    createRipple(e);
                    
                    // Get the target section ID
                    const targetSectionId = this.getAttribute('data-section');
                    
                    // Hide all sections
                    sections.forEach(section => {
                        section.classList.remove('active');
                        section.style.display = 'none';
                    });
                    
                    // Show only the target section
                    const targetSection = document.getElementById(targetSectionId);
                    if (targetSection) {
                        targetSection.classList.add('active');
                        targetSection.style.display = 'block';
                    } else {
                        console.warn('Target section not found:', targetSectionId);
                    }
                } catch (err) {
                    console.error('Error in nav click handler:', err);
                }
            });
        });
    } catch (e) {
        console.error('Error setting up navigation:', e);
    }
}

// Function to create ripple effect
function createRipple(event) {
    const button = event.currentTarget;
    
    // Remove any existing ripples
    const ripples = button.querySelectorAll('.ripple');
    ripples.forEach(ripple => ripple.remove());
    
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    // Get position relative to the button
    const rect = button.getBoundingClientRect();
    let x = event.clientX ? event.clientX - rect.left : event.touches[0].clientX - rect.left;
    let y = event.clientY ? event.clientY - rect.top : event.touches[0].clientY - rect.top;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${x - radius}px`;
    circle.style.top = `${y - radius}px`;
    circle.classList.add('ripple');
    
    button.appendChild(circle);
    
    // Remove ripple after animation completes
    setTimeout(() => {
        circle.remove();
    }, 600);
}

// Setup Month Selector
function setupMonthSelector() {
    const btn = document.getElementById('month-selector-btn');
    const dropdown = document.getElementById('month-picker-dropdown');
    const grid = document.getElementById('month-picker-grid');
    const label = document.getElementById('month-selector-label');
    const yearLabel = document.getElementById('month-picker-year-label');
    const yearPrevBtn = document.getElementById('year-prev');
    const yearNextBtn = document.getElementById('year-next');
    
    if (!btn || !dropdown || !grid) return;
    
    // Generate month buttons
    function renderMonths() {
        grid.innerHTML = '';
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        monthNames.forEach((name, index) => {
            const monthNum = index + 1;
            const monthBtn = document.createElement('button');
            monthBtn.type = 'button';
            monthBtn.className = 'month-btn';
            monthBtn.textContent = name;
            monthBtn.dataset.month = monthNum;
            
            // Highlight the currently selected month
            if (monthNum === selectedMonth && selectedYear === new Date().getFullYear()) {
                monthBtn.classList.add('selected');
            }
            
            monthBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Update global variables
                selectedMonth = monthNum;
                
                // Update all month buttons
                grid.querySelectorAll('.month-btn').forEach(m => m.classList.remove('selected'));
                monthBtn.classList.add('selected');
                
                // Update label
                label.textContent = `${selectedYear}年${String(selectedMonth).padStart(2, '0')}月`;
                
                // Update data displays
                updateTransactionsList();
                updateBalance();
                updateExpenseCharts();
                
                // Close dropdown
                dropdown.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
            });
            
            grid.appendChild(monthBtn);
        });
        
        yearLabel.textContent = `${selectedYear}年`;
    }
    
    // Toggle dropdown
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        dropdown.classList.toggle('active');
        btn.setAttribute('aria-expanded', dropdown.classList.contains('active'));
        if (dropdown.classList.contains('active')) {
            renderMonths();
        }
    });
    
    // Year navigation
    yearPrevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        selectedYear--;
        renderMonths();
    });
    
    yearNextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        selectedYear++;
        renderMonths();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
            btn.setAttribute('aria-expanded', 'false');
        }
    });
    
    // Initialize label and render months
    label.textContent = `${selectedYear}年${String(selectedMonth).padStart(2, '0')}月`;
    renderMonths();
}
