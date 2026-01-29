// Dati dei pasti
let meals = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: []
};

// Variabili per gestire i suggerimenti
let suggestionTimeout = null;
let currentSuggestions = [];

// Soglie di default
let thresholds = {
    calories: 2000,
    proteins: 150,
    carbs: 250,
    fats: 65
};

// Inizializzazione all'avvio
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    loadThresholds();
    renderMeals();
    updateTotals();
    setupSearchInput();
    updateThresholdsInputs();
});

// Carica le soglie salvate
function loadThresholds() {
    const savedThresholds = localStorage.getItem('macro-thresholds');
    if (savedThresholds) {
        try {
            thresholds = JSON.parse(savedThresholds);
        } catch (e) {
            console.error('Errore nel caricamento delle soglie:', e);
        }
    }
}

// Salva le soglie
function saveThresholds() {
    thresholds.calories = parseInt(document.getElementById('threshold-calories').value) || 2000;
    thresholds.proteins = parseInt(document.getElementById('threshold-proteins').value) || 150;
    thresholds.carbs = parseInt(document.getElementById('threshold-carbs').value) || 250;
    thresholds.fats = parseInt(document.getElementById('threshold-fats').value) || 65;
    
    localStorage.setItem('macro-thresholds', JSON.stringify(thresholds));
    showNotification('✅ Soglie salvate con successo!');
    
    // Aggiorna le statistiche se siamo nel tab settimana
    if (document.getElementById('week-tab').classList.contains('active')) {
        renderWeekStats();
    }
}

// Aggiorna gli input delle soglie con i valori salvati
function updateThresholdsInputs() {
    document.getElementById('threshold-calories').value = thresholds.calories;
    document.getElementById('threshold-proteins').value = thresholds.proteins;
    document.getElementById('threshold-carbs').value = thresholds.carbs;
    document.getElementById('threshold-fats').value = thresholds.fats;
}

// Setup input di ricerca con suggerimenti automatici
function setupSearchInput() {
    const searchInput = document.getElementById('search-input');
    const suggestionsDiv = document.getElementById('suggestions');

    // Mostra alimenti popolari quando si clicca sul campo vuoto
    searchInput.addEventListener('focus', function() {
        if (searchInput.value.trim().length === 0) {
            showPopularFoods();
        }
    });

    // Event listener per input
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        // Pulisci il timeout precedente
        if (suggestionTimeout) {
            clearTimeout(suggestionTimeout);
        }

        // Se la query è vuota, mostra alimenti popolari
        if (query.length === 0) {
            showPopularFoods();
            return;
        }

        // Se la query è troppo corta, nascondi i suggerimenti
        if (query.length < 2) {
            suggestionsDiv.classList.remove('active');
            return;
        }

        // Debounce: aspetta 300ms dopo che l'utente smette di scrivere
        suggestionTimeout = setTimeout(() => {
            fetchSuggestions(query);
        }, 300);
    });

    // Chiudi suggerimenti quando si clicca fuori
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.classList.remove('active');
        }
    });

    // Gestisci Enter per cercare
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            suggestionsDiv.classList.remove('active');
            searchFood();
        }
    });
}

// Mostra alimenti popolari italiani e piatti composti
function showPopularFoods() {
    const popularFoods = [
        // Piatti composti
        'spaghetti al pomodoro',
        'pasta al tonno',
        'riso al pomodoro',
        'insalata di riso',
        'pasta e fagioli',
        'risotto ai funghi',
        'pizza margherita',
        'toast prosciutto e formaggio',
        'panino con prosciutto',
        'latte e cereali',
        'yogurt e frutta',
        'insalata mista',
        // Singoli ingredienti
        'pasta',
        'riso',
        'pollo',
        'petto di pollo',
        'pane',
        'uova',
        'latte',
        'yogurt',
        'banana',
        'mela',
        'tonno',
        'salmone',
        'formaggio',
        'mozzarella'
    ];

    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '<div style="padding: 10px 15px; font-weight: 600; color: #667eea; font-size: 13px;">🔥 Ricerche popolari - Prova anche piatti composti!</div>';
    
    popularFoods.forEach(food => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        const isCompound = food.includes(' ') && (food.includes('al ') || food.includes('e ') || food.includes('con ') || food.includes('di '));
        div.innerHTML = `
            <div class="suggestion-item-name">${isCompound ? '🍽️ ' : ''}${food}</div>
            <div class="suggestion-item-info">Clicca per cercare</div>
        `;
        
        div.addEventListener('click', function() {
            document.getElementById('search-input').value = food;
            suggestionsDiv.classList.remove('active');
            searchFood();
        });
        
        suggestionsDiv.appendChild(div);
    });
    
    suggestionsDiv.classList.add('active');
}

// Recupera suggerimenti dall'API
async function fetchSuggestions(query) {
    const suggestionsDiv = document.getElementById('suggestions');
    
    try {
        const response = await fetch(
            `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&page_size=8&fields=product_name,nutriments,brands`
        );
        const data = await response.json();

        if (data.products && data.products.length > 0) {
            currentSuggestions = data.products.filter(p => {
                const nutrients = p.nutriments || {};
                return (nutrients['energy-kcal'] || nutrients['energy-kcal_100g']);
            });

            renderSuggestions(currentSuggestions);
        } else {
            suggestionsDiv.classList.remove('active');
        }
    } catch (error) {
        console.error('Errore nel recupero suggerimenti:', error);
        suggestionsDiv.classList.remove('active');
    }
}

// Renderizza i suggerimenti
function renderSuggestions(suggestions) {
    const suggestionsDiv = document.getElementById('suggestions');
    
    if (suggestions.length === 0) {
        suggestionsDiv.classList.remove('active');
        return;
    }

    suggestionsDiv.innerHTML = '';
    
    suggestions.forEach(product => {
        const nutrients = product.nutriments || {};
        const calories = nutrients['energy-kcal'] || nutrients['energy-kcal_100g'] || 0;
        const proteins = nutrients.proteins || nutrients.proteins_100g || 0;
        
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `
            <div class="suggestion-item-name">${product.product_name || 'Senza nome'}${product.brands ? ' - ' + product.brands : ''}</div>
            <div class="suggestion-item-info">${Math.round(calories)} kcal | Proteine: ${proteins.toFixed(1)}g</div>
        `;
        
        div.addEventListener('click', function() {
            document.getElementById('search-input').value = product.product_name || '';
            suggestionsDiv.classList.remove('active');
            searchFood();
        });
        
        suggestionsDiv.appendChild(div);
    });
    
    suggestionsDiv.classList.add('active');
}

// Carica i dati salvati per oggi
function loadData() {
    const today = new Date().toDateString();
    const savedData = localStorage.getItem(`meals-${today}`);
    if (savedData) {
        try {
            meals = JSON.parse(savedData);
        } catch (e) {
            console.error('Errore nel caricamento dei dati:', e);
            meals = {
                breakfast: [],
                lunch: [],
                dinner: [],
                snack: []
            };
        }
    }
}

// Salva i dati nel localStorage
function saveData() {
    const today = new Date().toDateString();
    localStorage.setItem(`meals-${today}`, JSON.stringify(meals));
}

// Cerca alimenti tramite API Open Food Facts
async function searchFood() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) {
        alert('Inserisci un alimento da cercare');
        return;
    }

    const resultsDiv = document.getElementById('search-results');
    resultsDiv.innerHTML = '<div class="loading">🔍 Ricerca in corso...</div>';

    try {
        const response = await fetch(
            `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&page_size=20&fields=product_name,nutriments,brands,code,image_url,image_small_url`
        );
        const data = await response.json();

        if (data.products && data.products.length > 0) {
            resultsDiv.innerHTML = '';
            
            // Filtra prodotti con dati nutrizionali validi
            const validProducts = data.products.filter(product => {
                const nutrients = product.nutriments || {};
                return (nutrients['energy-kcal'] || nutrients['energy-kcal_100g']);
            });

            if (validProducts.length === 0) {
                resultsDiv.innerHTML = '<div class="no-data">❌ Nessun alimento trovato con dati nutrizionali. Prova con un altro termine.</div>';
                return;
            }

            validProducts.forEach(product => {
                const nutrients = product.nutriments || {};
                
                const calories = nutrients['energy-kcal'] || nutrients['energy-kcal_100g'] || 0;
                const proteins = nutrients.proteins || nutrients.proteins_100g || 0;
                const carbs = nutrients.carbohydrates || nutrients.carbohydrates_100g || 0;
                const fats = nutrients.fat || nutrients.fat_100g || 0;

                const div = document.createElement('div');
                div.className = 'food-item';
                
                // Aggiungi immagine se disponibile
                const imageHtml = product.image_small_url ? 
                    `<img src="${product.image_small_url}" alt="${product.product_name}" class="food-image" onerror="this.style.display='none'">` : 
                    '<div class="food-image-placeholder">🍽️</div>';
                
                div.innerHTML = `
                    ${imageHtml}
                    <div class="food-info">
                        <h3>${product.product_name || 'Senza nome'}${product.brands ? ' - ' + product.brands : ''}</h3>
                        <p><strong>Per 100g:</strong> ${Math.round(calories)} kcal | 
                           Proteine: <strong>${proteins.toFixed(1)}g</strong> | 
                           Carboidrati: <strong>${carbs.toFixed(1)}g</strong> | 
                           Grassi: <strong>${fats.toFixed(1)}g</strong></p>
                    </div>
                    <div class="food-actions">
                        <div class="quantity-wrapper">
                            <label class="quantity-label">Grammi</label>
                            <input type="number" class="quantity-input" placeholder="100" value="100" min="1" id="qty-${product.code}">
                        </div>
                        <select class="meal-select" id="meal-${product.code}">
                            <option value="breakfast">Colazione</option>
                            <option value="lunch">Pranzo</option>
                            <option value="dinner">Cena</option>
                            <option value="snack">Snack</option>
                        </select>
                        <button class="btn btn-primary" onclick="addFoodToMeal('${product.code}', \`${(product.product_name || 'Senza nome').replace(/`/g, '')}\`, ${calories}, ${proteins}, ${carbs}, ${fats})">
                            ➕ Aggiungi
                        </button>
                    </div>
                `;
                resultsDiv.appendChild(div);
            });
        } else {
            resultsDiv.innerHTML = '<div class="no-data">❌ Nessun alimento trovato. Prova con un altro termine di ricerca.</div>';
        }
    } catch (error) {
        console.error('Errore nella ricerca:', error);
        resultsDiv.innerHTML = '<div class="no-data">❌ Errore nella ricerca. Controlla la connessione e riprova.</div>';
    }
}

// Aggiungi alimento al pasto
function addFoodToMeal(code, name, calories, proteins, carbs, fats) {
    const quantityInput = document.getElementById(`qty-${code}`);
    const mealSelect = document.getElementById(`meal-${code}`);
    
    if (!quantityInput || !mealSelect) {
        console.error('Input non trovati');
        return;
    }
    
    const quantity = parseInt(quantityInput.value) || 100;
    const meal = mealSelect.value;
    const factor = quantity / 100;

    const item = {
        id: Date.now(),
        name: name,
        quantity: quantity,
        calories: Math.round(calories * factor),
        proteins: parseFloat((proteins * factor).toFixed(1)),
        carbs: parseFloat((carbs * factor).toFixed(1)),
        fats: parseFloat((fats * factor).toFixed(1))
    };

    meals[meal].push(item);
    saveData();
    renderMeals();
    updateTotals();

    // Feedback visivo
    quantityInput.value = 100;
    showNotification(`✅ ${name} aggiunto a ${getMealName(meal)}!`);
}

// Ottieni nome del pasto in italiano
function getMealName(mealType) {
    const names = {
        breakfast: 'Colazione',
        lunch: 'Pranzo',
        dinner: 'Cena',
        snack: 'Snack'
    };
    return names[mealType] || mealType;
}

// Mostra notifica temporanea
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Renderizza i pasti
function renderMeals() {
    ['breakfast', 'lunch', 'dinner', 'snack'].forEach(mealType => {
        const list = document.getElementById(`${mealType}-list`);
        if (!list) return;
        
        list.innerHTML = '';

        if (meals[mealType].length === 0) {
            list.innerHTML = '<div class="no-data" style="padding: 20px; font-size: 0.9em;">Nessun alimento aggiunto</div>';
            return;
        }

        meals[mealType].forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'meal-item';
            div.innerHTML = `
                <div class="meal-item-info">
                    <h4>${item.name} (${item.quantity}g)</h4>
                    <div class="macros">
                        <span class="macro">
                            <span class="macro-label">Cal:</span> ${item.calories}
                        </span>
                        <span class="macro">
                            <span class="macro-label">Proteine:</span> ${item.proteins}g
                        </span>
                        <span class="macro">
                            <span class="macro-label">Carboidrati:</span> ${item.carbs}g
                        </span>
                        <span class="macro">
                            <span class="macro-label">Grassi:</span> ${item.fats}g
                        </span>
                    </div>
                </div>
                <button class="btn btn-danger" onclick="removeFood('${mealType}', ${index})">
                    🗑️ Rimuovi
                </button>
            `;
            list.appendChild(div);
        });
    });
}

// Rimuovi alimento
function removeFood(mealType, index) {
    const item = meals[mealType][index];
    meals[mealType].splice(index, 1);
    saveData();
    renderMeals();
    updateTotals();
    showNotification(`🗑️ ${item.name} rimosso`);
}

// Aggiorna i totali giornalieri
function updateTotals() {
    let totals = { 
        calories: 0, 
        proteins: 0, 
        carbs: 0, 
        fats: 0 
    };

    Object.values(meals).forEach(meal => {
        meal.forEach(item => {
            totals.calories += item.calories;
            totals.proteins += item.proteins;
            totals.carbs += item.carbs;
            totals.fats += item.fats;
        });
    });

    document.getElementById('total-calories').textContent = Math.round(totals.calories);
    document.getElementById('total-proteins').textContent = totals.proteins.toFixed(1) + 'g';
    document.getElementById('total-carbs').textContent = totals.carbs.toFixed(1) + 'g';
    document.getElementById('total-fats').textContent = totals.fats.toFixed(1) + 'g';
}

// Switch tra i tab
function switchTab(tab) {
    // Rimuovi classe active da tutti i tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // Aggiungi classe active al tab selezionato
    event.target.classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');

    // Se si passa al tab settimana, renderizza le statistiche
    if (tab === 'week') {
        renderWeekStats();
    }
}

// Renderizza le statistiche settimanali
function renderWeekStats() {
    const weekStats = [];
    const today = new Date();

    // Raccolta dati degli ultimi 7 giorni
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toDateString();
        const savedData = localStorage.getItem(`meals-${dateString}`);

        let dayTotals = { 
            calories: 0, 
            proteins: 0, 
            carbs: 0, 
            fats: 0 
        };

        if (savedData) {
            try {
                const dayMeals = JSON.parse(savedData);
                Object.values(dayMeals).forEach(meal => {
                    meal.forEach(item => {
                        dayTotals.calories += item.calories;
                        dayTotals.proteins += item.proteins;
                        dayTotals.carbs += item.carbs;
                        dayTotals.fats += item.fats;
                    });
                });
            } catch (e) {
                console.error('Errore nel parsing dei dati del giorno:', e);
            }
        }

        weekStats.push({
            date: date,
            dateString: dateString,
            ...dayTotals
        });
    }

    // Calcola le medie
    const avg = { 
        calories: 0, 
        proteins: 0, 
        carbs: 0, 
        fats: 0 
    };
    
    const daysWithData = weekStats.filter(d => d.calories > 0).length;

    if (daysWithData > 0) {
        weekStats.forEach(day => {
            avg.calories += day.calories;
            avg.proteins += day.proteins;
            avg.carbs += day.carbs;
            avg.fats += day.fats;
        });

        avg.calories = Math.round(avg.calories / daysWithData);
        avg.proteins = parseFloat((avg.proteins / daysWithData).toFixed(1));
        avg.carbs = parseFloat((avg.carbs / daysWithData).toFixed(1));
        avg.fats = parseFloat((avg.fats / daysWithData).toFixed(1));
    }

    // Funzione per determinare lo stato rispetto alle soglie
    const getThresholdStatus = (value, threshold) => {
        const percentage = (value / threshold) * 100;
        if (percentage >= 90 && percentage <= 110) return { class: 'perfect', text: '✅ Perfetto', color: '#ffd43b' };
        if (percentage < 90) return { class: 'under', text: '📉 Sotto target', color: '#51cf66' };
        return { class: 'over', text: '⚠️ Sopra target', color: '#ff6b6b' };
    };

    // Aggiorna i valori medi con confronto alle soglie
    const caloriesStatus = getThresholdStatus(avg.calories, thresholds.calories);
    const proteinsStatus = getThresholdStatus(avg.proteins, thresholds.proteins);
    const carbsStatus = getThresholdStatus(avg.carbs, thresholds.carbs);
    const fatsStatus = getThresholdStatus(avg.fats, thresholds.fats);

    document.getElementById('avg-calories').textContent = avg.calories;
    document.getElementById('avg-proteins').textContent = avg.proteins + 'g';
    document.getElementById('avg-carbs').textContent = avg.carbs + 'g';
    document.getElementById('avg-fats').textContent = avg.fats + 'g';

    document.getElementById('threshold-calories-text').innerHTML = `Target: ${thresholds.calories} kcal<br><span class="threshold-status ${caloriesStatus.class}">${caloriesStatus.text}</span>`;
    document.getElementById('threshold-proteins-text').innerHTML = `Target: ${thresholds.proteins}g<br><span class="threshold-status ${proteinsStatus.class}">${proteinsStatus.text}</span>`;
    document.getElementById('threshold-carbs-text').innerHTML = `Target: ${thresholds.carbs}g<br><span class="threshold-status ${carbsStatus.class}">${carbsStatus.text}</span>`;
    document.getElementById('threshold-fats-text').innerHTML = `Target: ${thresholds.fats}g<br><span class="threshold-status ${fatsStatus.class}">${fatsStatus.text}</span>`;

    // Renderizza i dettagli giornalieri
    const statsDiv = document.getElementById('week-stats');
    statsDiv.innerHTML = '';

    if (daysWithData === 0) {
        statsDiv.innerHTML = '<div class="no-data">📊 Nessun dato disponibile. Inizia a tracciare i tuoi pasti!</div>';
        return;
    }

    weekStats.reverse().forEach(day => {
        const div = document.createElement('div');
        div.className = 'day-card';

        const dayName = day.date.toLocaleDateString('it-IT', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        });

        const isToday = day.dateString === new Date().toDateString();

        // Determina se i valori sono in eccesso rispetto alle SOGLIE PERSONALIZZATE
        const getStatus = (value, threshold) => {
            if (threshold === 0) return '';
            const percentage = (value / threshold) * 100;
            if (percentage > 120) return 'danger';
            if (percentage > 110) return 'warning';
            return '';
        };

        const getStatusText = (value, threshold) => {
            if (threshold === 0) return '';
            const percentage = Math.round((value / threshold) * 100);
            if (percentage > 120) return `⚠️ Eccesso (${percentage}%)`;
            if (percentage > 110) return `⚡ Sopra target (${percentage}%)`;
            if (percentage < 90) return `📉 Sotto target (${percentage}%)`;
            return `✅ Nel target (${percentage}%)`;
        };

        div.innerHTML = `
            <div class="day-header">
                <div class="day-name">${isToday ? '🔵 ' : ''}${dayName}</div>
                <div class="day-total">${Math.round(day.calories)} kcal / ${thresholds.calories} kcal</div>
            </div>
            <div class="day-macros">
                <div class="macro-card ${getStatus(day.proteins, thresholds.proteins)}">
                    <div class="macro-card-label">Proteine</div>
                    <div class="macro-card-value">${day.proteins.toFixed(1)}g / ${thresholds.proteins}g</div>
                    <div class="macro-card-status">${getStatusText(day.proteins, thresholds.proteins)}</div>
                </div>
                <div class="macro-card ${getStatus(day.carbs, thresholds.carbs)}">
                    <div class="macro-card-label">Carboidrati</div>
                    <div class="macro-card-value">${day.carbs.toFixed(1)}g / ${thresholds.carbs}g</div>
                    <div class="macro-card-status">${getStatusText(day.carbs, thresholds.carbs)}</div>
                </div>
                <div class="macro-card ${getStatus(day.fats, thresholds.fats)}">
                    <div class="macro-card-label">Grassi</div>
                    <div class="macro-card-value">${day.fats.toFixed(1)}g / ${thresholds.fats}g</div>
                    <div class="macro-card-status">${getStatusText(day.fats, thresholds.fats)}</div>
                </div>
            </div>
        `;
        statsDiv.appendChild(div);
    });
}

// Aggiungi stili per le animazioni
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);