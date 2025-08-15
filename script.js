const API_BASE_URL = 'https://pokeapi.co/api/v2';
const POKEMON_PER_PAGE = 50;

let allPokemon = [];
let filteredPokemon = [];
let currentPage = 1;

// Referencias DOM
const pokemonGrid = document.getElementById('pokemonGrid');
const loading = document.getElementById('loading');
const totalCount = document.getElementById('totalCount');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const pokemonModal = document.getElementById('pokemonModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');

const searchInput = document.getElementById('search');
const typeFiltersDiv = document.getElementById('typeFilters');
const generationSelect = document.getElementById('generationSelect');
const sortSelect = document.getElementById('sortSelect');
const resetFiltersBtn = document.getElementById('resetFilters');

const POKEMON_TYPES = [
  'normal','fire','water','electric','grass','ice','fighting','poison','ground',
  'flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'
];

const GENERATIONS = [
  { id: 1, name: '1.Generación Kanto', url: `${API_BASE_URL}/generation/1` },
  { id: 2, name: '2.Generación Johto', url: `${API_BASE_URL}/generation/2` },
  { id: 3, name: '3.Generación Hoenn', url: `${API_BASE_URL}/generation/3` },
  { id: 4, name: '4.Generación Sinnoh', url: `${API_BASE_URL}/generation/4` },
  { id: 5, name: '5.Generación Teselia', url: `${API_BASE_URL}/generation/5` },
  { id: 6, name: '6.Generación Teselia', url: `${API_BASE_URL}/generation/6` },
  { id: 7, name: '7.Generación Alola', url: `${API_BASE_URL}/generation/7` },
  { id: 8, name: '8.Generación Galar', url: `${API_BASE_URL}/generation/8` },
  { id: 9, name: '9.Generación paldea', url: `${API_BASE_URL}/generation/9` },
];

// Estado filtros
let selectedTypes = new Set();
let selectedGeneration = '';
let searchTerm = '';
let sortBy = 'id';

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  await loadAllPokemon();
  setupFilters();
  applyFilters();
  setupEventListeners();
});

// Cargar todos los Pokémon
async function loadAllPokemon() {
  showLoading(true);
  try {
    const limit = 1000;
    const response = await fetch(`${API_BASE_URL}/pokemon?limit=${limit}`);
    const data = await response.json();

    allPokemon = [];
    const batchSize = 50;
    for (let i = 0; i < data.results.length; i += batchSize) {
      const batch = data.results.slice(i, i + batchSize);
      const batchDetails = await Promise.all(batch.map(p => fetchPokemonDetails(p.url)));
      allPokemon.push(...batchDetails.filter(p => p != null));
      updateLoadingText(`Cargando Pokémon... (${allPokemon.length}/${limit})`);
    }
  } catch (e) {
    alert('Error cargando Pokémon: ' + e.message);
  } finally {
    showLoading(false);
  }
}

async function fetchPokemonDetails(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error('Error fetching Pokémon details:', e);
    return null;
  }
}

// Configurar filtros
function setupFilters() {
  // Tipos con colores
  POKEMON_TYPES.forEach(type => {
    const btn = document.createElement('button');
    btn.textContent = capitalize(type);
    btn.className = `px-3 py-1 rounded text-white text-xs font-semibold ${getTypeColor(type)} hover:opacity-80 transition-all duration-300`;
    btn.dataset.type = type;
    btn.addEventListener('click', () => {
      if (selectedTypes.has(type)) {
        selectedTypes.delete(type);
        btn.classList.remove('ring', 'ring-4', 'ring-offset-2', 'ring-pink-300');
      } else {
        selectedTypes.add(type);
        btn.classList.add('ring', 'ring-4', 'ring-offset-2', 'ring-pink-300');
      }
      currentPage = 1;
      applyFilters();
    });
    typeFiltersDiv.appendChild(btn);
  });

  GENERATIONS.forEach(gen => {
    const option = document.createElement('option');
    option.value = gen.id;
    option.textContent = gen.name;
    generationSelect.appendChild(option);
  });
}

// Aplicar filtros y ordenar
function applyFilters() {
  searchTerm = searchInput.value.trim().toLowerCase();

  filteredPokemon = allPokemon.filter(p => {
    const nameMatch = p.name.toLowerCase().includes(searchTerm);
    const typeMatch = selectedTypes.size === 0 || p.types.some(t => selectedTypes.has(t.type.name));

    let genMatch = true;
    if (selectedGeneration) {
      genMatch = generationMatch(p.id, parseInt(selectedGeneration));
    }

    return nameMatch && typeMatch && genMatch;
  });

  filteredPokemon.sort((a, b) => {
    switch(sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'height': return a.height - b.height;
      case 'weight': return a.weight - b.weight;
      default: return a.id - b.id;
    }
  });

  updatePagination();
  renderCurrentPage();
}

function generationMatch(pokemonId, generationId) {
  const genRanges = {
    1: [1, 151],
    2: [152, 251],
    3: [252, 386],
    4: [387, 493],
    5: [494, 649],
    6: [650, 721],
    7: [722, 809],
    8: [810, 898],
    9: [899, 1000],
  };
  const [start, end] = genRanges[generationId] || [1, 1000];
  return pokemonId >= start && pokemonId <= end;
}

function updatePagination() {
  const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
  pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
  totalCount.textContent = filteredPokemon.length;
}

function renderCurrentPage() {
  pokemonGrid.innerHTML = '';
  if (filteredPokemon.length === 0) {
    pokemonGrid.innerHTML = `<p class="col-span-full text-center text-gray-500">No se encontraron Pokémon.</p>`;
    return;
  }

  const startIndex = (currentPage - 1) * POKEMON_PER_PAGE;
  const pagePokemon = filteredPokemon.slice(startIndex, startIndex + POKEMON_PER_PAGE);

  pagePokemon.forEach(pokemon => {
    const card = createPokemonCard(pokemon);
    pokemonGrid.appendChild(card);
  });
}

function createPokemonCard(pokemon) {
  const card = document.createElement('div');
  card.className = 'bg-white rounded-xl shadow-lg p-4 flex flex-col items-center text-center fade-in transition-all duration-500 hover:scale-105';

  card.innerHTML = `
    <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" class="w-24 h-24 mb-2 drop-shadow-lg" />
    <h3 class="text-lg font-bold capitalize mb-1 text-pink-600">#${pokemon.id} ${pokemon.name}</h3>
    <div class="flex justify-center gap-1 mb-2 flex-wrap">
      ${pokemon.types.map(t => `<span class="text-white text-xs px-2 py-1 rounded-full ${getTypeColor(t.type.name)}">${capitalize(t.type.name)}</span>`).join('')}
    </div>
    <button class="bg-pink-500 text-white px-3 py-1 rounded-lg hover:bg-pink-600 transition-all duration-300" data-id="${pokemon.id}">
      Ver Detalle
    </button>
  `;

  const btn = card.querySelector('button');
  btn.addEventListener('click', () => showPokemonDetails(pokemon));

  return card;
}

function showPokemonDetails(pokemon) {
  modalTitle.textContent = `#${pokemon.id} ${capitalize(pokemon.name)}`;
  modalContent.innerHTML = `
    <div class="text-center mb-4">
      <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" class="w-32 h-32 mx-auto drop-shadow-lg" />
    </div>
    <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
      <div><strong>Altura:</strong> ${(pokemon.height / 10).toFixed(1)} m</div>
      <div><strong>Peso:</strong> ${(pokemon.weight / 10).toFixed(1)} kg</div>
      <div><strong>Experiencia base:</strong> ${pokemon.base_experience}</div>
      <div><strong>Tipos:</strong> ${pokemon.types.map(t => capitalize(t.type.name)).join(', ')}</div>
    </div>
    <div>
      <strong>Habilidades:</strong>
      <ul class="list-disc list-inside text-sm mt-1">
        ${pokemon.abilities.map(a => `<li>${capitalize(a.ability.name)}</li>`).join('')}
      </ul>
    </div>
  `;
  pokemonModal.classList.remove('hidden');
}

closeModal.addEventListener('click', () => {
  pokemonModal.classList.add('hidden');
});

pokemonModal.addEventListener('click', e => {
  if (e.target === pokemonModal) {
    pokemonModal.classList.add('hidden');
  }
});

function setupEventListeners() {
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderCurrentPage();
      updatePagination();
    }
  });

  nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
    if (currentPage < totalPages) {
      currentPage++;
      renderCurrentPage();
      updatePagination();
    }
  });

  searchInput.addEventListener('input', () => {
    currentPage = 1;
    applyFilters();
  });

  generationSelect.addEventListener('change', () => {
    selectedGeneration = generationSelect.value;
    currentPage = 1;
    applyFilters();
  });

  sortSelect.addEventListener('change', () => {
    sortBy = sortSelect.value;
    currentPage = 1;
    applyFilters();
  });

  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    selectedTypes.clear();
    selectedGeneration = '';
    generationSelect.value = '';
    sortSelect.value = 'id';
    sortBy = 'id';

    typeFiltersDiv.querySelectorAll('button').forEach(btn => {
      btn.classList.remove('ring', 'ring-4', 'ring-offset-2', 'ring-pink-300');
    });

    currentPage = 1;
    applyFilters();
  });
}

function showLoading(show) {
  loading.classList.toggle('hidden', !show);
}

function updateLoadingText(text) {
  loading.querySelector('p').textContent = text;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Colores
function getTypeColor(type) {
  const colors = {
    normal: 'bg-pink-400 shadow-lg shadow-pink-500/50',
    fire: 'bg-rose-500 shadow-lg shadow-rose-500/50',
    water: 'bg-sky-400 shadow-lg shadow-sky-500/50',
    electric: 'bg-yellow-300 text-gray-900 shadow-lg shadow-yellow-400/50',
    grass: 'bg-lime-400 text-gray-900 shadow-lg shadow-lime-400/50',
    ice: 'bg-cyan-300 shadow-lg shadow-cyan-400/50',
    fighting: 'bg-red-400 shadow-lg shadow-red-500/50',
    poison: 'bg-fuchsia-500 shadow-lg shadow-fuchsia-500/50',
    ground: 'bg-amber-400 text-gray-900 shadow-lg shadow-amber-500/50',
    flying: 'bg-indigo-400 shadow-lg shadow-indigo-500/50',
    psychic: 'bg-pink-500 shadow-lg shadow-pink-500/50',
    bug: 'bg-green-400 text-gray-900 shadow-lg shadow-green-400/50',
    rock: 'bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-400/50',
    ghost: 'bg-violet-500 shadow-lg shadow-violet-500/50',
    dragon: 'bg-purple-500 shadow-lg shadow-purple-500/50',
    dark: 'bg-gray-800 shadow-lg shadow-gray-700/50',
    steel: 'bg-slate-400 text-gray-900 shadow-lg shadow-slate-400/50',
    fairy: 'bg-pink-300 shadow-lg shadow-pink-300/50',
  };
  return colors[type] || 'bg-gray-300 shadow-lg';
}
