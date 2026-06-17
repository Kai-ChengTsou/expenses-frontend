// Categories Config
const EXPENSE_CATEGORIES = [
    { id: 'food', label: '食物', icon: 'fas fa-utensils', color: '#9b7cff', bg: '#2a2441', gradient: 'linear-gradient(90deg, #7c3aed, #9b7cff, #c4b5fd)' },
    { id: 'rent', label: '租房', icon: 'fas fa-home', color: '#ff4f7b', bg: '#3a1f2b', gradient: 'linear-gradient(90deg, #e11d48, #ff4f7b, #fb7185)' },
    { id: 'mortgage', label: '房貸', icon: 'fas fa-building', color: '#ffb547', bg: '#3a2a16', gradient: 'linear-gradient(90deg, #d97706, #ffb547, #fde68a)' },
    { id: 'transport', label: '交通', icon: 'fas fa-bus', color: '#45a3ff', bg: '#182e49', gradient: 'linear-gradient(90deg, #2563eb, #45a3ff, #7dd3fc)' },
    { id: 'subscription', label: '訂閱', icon: 'fas fa-calendar-check', color: '#28d6c8', bg: '#123838', gradient: 'linear-gradient(90deg, #0f766e, #28d6c8, #99f6e4)' },
    { id: 'daily', label: '日常用品', icon: 'fas fa-shopping-basket', color: '#ff7a1a', bg: '#3d2110', gradient: 'linear-gradient(90deg, #ea580c, #ff7a1a, #fdba74)' },
    { id: 'cat', label: '貓咪', icon: 'fas fa-paw', color: '#4ade80', bg: '#183824', gradient: 'linear-gradient(90deg, #16a34a, #4ade80, #bbf7d0)' },
    { id: 'entertainment', label: '娛樂', icon: 'fas fa-gamepad', color: '#d65cff', bg: '#351d42', gradient: 'linear-gradient(90deg, #a21caf, #d65cff, #f0abfc)' },
    { id: 'gf', label: '女友', icon: 'fas fa-heart', color: '#ff5ab3', bg: '#3b1f35', gradient: 'linear-gradient(90deg, #db2777, #ff5ab3, #f9a8d4)' },
    { id: 'shopping', label: '購物', icon: 'fas fa-shopping-bag', color: '#ff3d5a', bg: '#3c1b24', gradient: 'linear-gradient(90deg, #b91c1c, #ff3d5a, #fca5a5)' },
    { id: 'investment', label: '投資', icon: 'fas fa-chart-line', color: '#2dd4ff', bg: '#143240', gradient: 'linear-gradient(90deg, #0284c7, #2dd4ff, #67e8f9)' },
    { id: 'other', label: '其他', icon: 'fas fa-box', color: '#b4bdcf', bg: '#252b3a', gradient: 'linear-gradient(90deg, #64748b, #b4bdcf, #e2e8f0)' }
];

const INCOME_CATEGORIES = [
    { id: 'salary', label: '薪水', icon: 'fas fa-money-bill-wave', color: '#22c55e', bg: '#153821' },
    { id: 'bonus', label: '獎金', icon: 'fas fa-star', color: '#facc15', bg: '#3a3210' },
    { id: 'invest', label: '投資', icon: 'fas fa-chart-line', color: '#38bdf8', bg: '#143247' },
    { id: 'gift', label: '禮金', icon: 'fas fa-gift', color: '#a78bfa', bg: '#2d2545' },
    { id: 'parttime', label: '兼職', icon: 'fas fa-briefcase', color: '#14b8a6', bg: '#123633' },
    { id: 'other', label: '其他', icon: 'fas fa-box', color: '#cbd5e1', bg: '#273040' }
];

function getCategoryVisualStyle(category) {
    if (!category) return '';
    const themedCategory = getThemedCategory(category);
    return `--category-color: ${themedCategory.color}; --category-bg: ${themedCategory.bg};`;
}

function getThemedCategory(category) {
    if (!category) return null;
    const cute = CUTE_CATEGORY_OVERRIDES[category.id];
    if (currentTheme === THEMES.CUTE && cute) {
        return {
            ...category,
            color: cute.color,
            bg: cute.bg,
            gradient: cute.gradient || category.gradient
        };
    }
    return category;
}

function findCategoryConfig(categoryValue, isIncome = false) {
    const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return categories.find(c => c.label === categoryValue || c.id === categoryValue);
}
