// URL da API TACO
const API_URL = 'https://taco-api.netlify.app/graphql';

let currentFoodData = null;
let allFoods = [];

// Elementos DOM
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const foodsGrid = document.getElementById('foodsGrid');
const errorMessage = document.getElementById('errorMessage');
const noResults = document.getElementById('noResults');
const detailedView = document.getElementById('detailedView');
const closeBtn = document.getElementById('closeBtn');
const portionInput = document.getElementById('portionInput');

// Event listeners
searchBtn.addEventListener('click', searchFoods);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchFoods();
});
searchInput.addEventListener('input', debounce(searchFoods, 500));
closeBtn.addEventListener('click', closeDetailedView);
portionInput.addEventListener('input', updateDetailedNutrition);

detailedView.addEventListener('click', (e) => {
    if (e.target === detailedView) closeDetailedView();
});

// Função debounce para evitar muitas requisições
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Buscar alimentos na API
async function searchFoods() {
    const query = searchInput.value.trim();
    if (query.length < 2) {
        foodsGrid.innerHTML = '';
        return;
    }

    showLoading(true);
    hideMessages();

    try {
        const graphqlQuery = {
            query: `
                query GetFoods {
                    foods {
                        id
                        description
                        category {
                            id
                            name
                        }
                        attributes {
                            id
                            name
                            value
                            unit
                        }
                    }
                }
            `
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(graphqlQuery)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.errors) {
            throw new Error(data.errors[0].message);
        }

        if (!data.data || !data.data.foods) {
            throw new Error('Estrutura de dados inesperada');
        }

        allFoods = data.data.foods;
        filterAndDisplayFoods(query);
        
    } catch (error) {
        console.error('Erro detalhado:', error);
        showError(`Erro ao consultar a API: ${error.message}`);
    }

    showLoading(false);
}

// Filtrar e exibir alimentos
function filterAndDisplayFoods(query) {
    const filteredFoods = allFoods.filter(food => 
        food.description.toLowerCase().includes(query.toLowerCase())
    );

    if (filteredFoods.length === 0) {
        noResults.classList.remove('hidden');
        return;
    }

    displayFoods(filteredFoods);
}

// Exibir alimentos na grid
function displayFoods(foods) {
    foodsGrid.innerHTML = '';
    
    foods.slice(0, 12).forEach((food, index) => {
        const foodCard = createFoodCard(food, index);
        foodsGrid.appendChild(foodCard);
    });
}

// Criar card do alimento
function createFoodCard(food, index) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl p-6 shadow-lg hover-lift border border-gray-100 animate-fade-in';
    card.style.animationDelay = `${index * 0.1}s`;

    const macros = extractMacros(food.attributes);

    card.innerHTML = `
        <div class="mb-4">
            <h3 class="text-xl font-bold text-gray-800 mb-2 line-clamp-2">${food.description}</h3>
            <span class="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                ${food.category?.name || 'Alimento'}
            </span>
        </div>
        
        <div class="bg-indigo-50 rounded-xl p-4 mb-4 flex items-center justify-center gap-3">
            <label class="text-gray-700 font-medium text-sm">Quantidade:</label>
            <input 
                type="number" 
                class="w-20 px-3 py-2 text-center border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all card-portion-input" 
                value="100" 
                min="1" 
                max="9999" 
                data-food-id="${food.id}"
            >
            <label class="text-gray-700 font-medium text-sm">g</label>
        </div>
        
        <div class="grid grid-cols-2 gap-3 mb-6" id="macros-${food.id}">
            <div class="text-center p-4 rounded-xl text-white macro-gradient-1 hover:scale-105 transition-transform">
                <div class="text-2xl font-bold">${macros.calories.toFixed(0)}</div>
                <div class="text-sm opacity-90">kcal</div>
            </div>
            <div class="text-center p-4 rounded-xl text-white macro-gradient-2 hover:scale-105 transition-transform">
                <div class="text-2xl font-bold">${macros.carbs.toFixed(1)}</div>
                <div class="text-sm opacity-90">Carbs (g)</div>
            </div>
            <div class="text-center p-4 rounded-xl text-white macro-gradient-3 hover:scale-105 transition-transform">
                <div class="text-2xl font-bold">${macros.proteins.toFixed(1)}</div>
                <div class="text-sm opacity-90">Proteínas (g)</div>
            </div>
            <div class="text-center p-4 rounded-xl text-white macro-gradient-4 hover:scale-105 transition-transform">
                <div class="text-2xl font-bold">${macros.fats.toFixed(1)}</div>
                <div class="text-sm opacity-90">Gorduras (g)</div>
            </div>
        </div>
        
        <button class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 hover:shadow-lg transform hover:scale-105 view-details-btn">
            Ver Detalhes Completos
        </button>
    `;

    // Event listeners
    const portionInput = card.querySelector('.card-portion-input');
    portionInput.addEventListener('input', (e) => {
        e.stopPropagation();
        updateCardMacros(food, e.target.value);
    });

    const viewBtn = card.querySelector('.view-details-btn');
    viewBtn.addEventListener('click', () => showDetailedView(food.id));

    return card;
}

// Extrair macronutrientes dos atributos
function extractMacros(attributes) {
    const macros = { calories: 0, carbs: 0, proteins: 0, fats: 0 };
    
    attributes.forEach(attr => {
        const name = attr.name.toLowerCase();
        const value = parseFloat(attr.value) || 0;
        
        if (name.includes('energia') || name.includes('caloria')) {
            macros.calories = value;
        } else if (name.includes('carboidrato')) {
            macros.carbs = value;
        } else if (name.includes('proteína')) {
            macros.proteins = value;
        } else if (name.includes('lipídeos') || name.includes('gordura')) {
            macros.fats = value;
        }
    });

    return macros;
}

// Atualizar macros do card
function updateCardMacros(food, portion) {
    const factor = parseFloat(portion) / 100 || 1;
    const macros = extractMacros(food.attributes);
    const macrosContainer = document.getElementById(`macros-${food.id}`);
    
    if (macrosContainer) {
        macrosContainer.innerHTML = `
            <div class="text-center p-4 rounded-xl text-white macro-gradient-1 hover:scale-105 transition-transform">
                <div class="text-2xl font-bold">${(macros.calories * factor).toFixed(0)}</div>
                <div class="text-sm opacity-90">kcal</div>
            </div>
            <div class="text-center p-4 rounded-xl text-white macro-gradient-2 hover:scale-105 transition-transform">
                <div class="text-2xl font-bold">${(macros.carbs * factor).toFixed(1)}</div>
                <div class="text-sm opacity-90">Carbs (g)</div>
            </div>
            <div class="text-center p-4 rounded-xl text-white macro-gradient-3 hover:scale-105 transition-transform">
                <div class="text-2xl font-bold">${(macros.proteins * factor).toFixed(1)}</div>
                <div class="text-sm opacity-90">Proteínas (g)</div>
            </div>
            <div class="text-center p-4 rounded-xl text-white macro-gradient-4 hover:scale-105 transition-transform">
                <div class="text-2xl font-bold">${(macros.fats * factor).toFixed(1)}</div>
                <div class="text-sm opacity-90">Gorduras (g)</div>
            </div>
        `;
    }
}

// Mostrar visualização detalhada
function showDetailedView(foodId) {
    const food = allFoods.find(f => f.id === foodId);
    if (!food) return;

    currentFoodData = food;
    
    document.getElementById('detailedTitle').textContent = food.description;
    document.getElementById('detailedCategory').textContent = food.category?.name || 'Alimento';
    
    updateDetailedNutrition();
    detailedView.classList.remove('hidden');
    detailedView.classList.add('flex');
}

// Atualizar nutrição detalhada
function updateDetailedNutrition() {
    if (!currentFoodData) return;

    const portion = parseFloat(portionInput.value) || 100;
    const factor = portion / 100;
    const macros = extractMacros(currentFoodData.attributes);
    
    // Atualizar macros principais
    document.getElementById('detailedMacros').innerHTML = `
        <div class="text-center p-6 rounded-2xl text-white macro-gradient-1">
            <div class="text-3xl font-bold mb-2">${(macros.calories * factor).toFixed(0)}</div>
            <div class="text-sm uppercase tracking-wide opacity-90">Calorias</div>
        </div>
        <div class="text-center p-6 rounded-2xl text-white macro-gradient-2">
            <div class="text-3xl font-bold mb-2">${(macros.carbs * factor).toFixed(1)}</div>
            <div class="text-sm uppercase tracking-wide opacity-90">Carboidratos (g)</div>
        </div>
        <div class="text-center p-6 rounded-2xl text-white macro-gradient-3">
            <div class="text-3xl font-bold mb-2">${(macros.proteins * factor).toFixed(1)}</div>
            <div class="text-sm uppercase tracking-wide opacity-90">Proteínas (g)</div>
        </div>
        <div class="text-center p-6 rounded-2xl text-white macro-gradient-4">
            <div class="text-3xl font-bold mb-2">${(macros.fats * factor).toFixed(1)}</div>
            <div class="text-sm uppercase tracking-wide opacity-90">Gorduras (g)</div>
        </div>
    `;

    // Atualizar nutrientes detalhados
    const detailedNutrients = document.getElementById('detailedNutrients');
    detailedNutrients.innerHTML = '';

    currentFoodData.attributes.forEach(attr => {
        const value = parseFloat(attr.value) || 0;
        const adjustedValue = (value * factor).toFixed(2);
        
        const nutrientItem = document.createElement('div');
        nutrientItem.className = 'flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border-l-4 border-indigo-500';
        nutrientItem.innerHTML = `
            <span class="font-medium text-gray-700">${attr.name}</span>
            <span class="font-bold text-indigo-600">${adjustedValue} ${attr.unit || ''}</span>
        `;
        detailedNutrients.appendChild(nutrientItem);
    });
}

// Fechar visualização detalhada
function closeDetailedView() {
    detailedView.classList.add('hidden');
    detailedView.classList.remove('flex');
    currentFoodData = null;
}

// Mostrar loading
function showLoading(show) {
    loading.classList.toggle('hidden', !show);
}

// Mostrar erro
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Esconder mensagens
function hideMessages() {
    errorMessage.classList.add('hidden');
    noResults.classList.add('hidden');
}

// Carregar alguns alimentos ao iniciar
window.addEventListener('load', () => {
    searchInput.value = 'arroz';
    setTimeout(searchFoods, 500);
});