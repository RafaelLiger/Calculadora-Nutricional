let alimentos = [];
let dieta = [];
const STORAGE_KEY = 'dieta_v1';

// Função de segurança para números
function safeNumber(valor) {
  if (valor === 'NA' || valor === '' || valor === null || valor === undefined || isNaN(Number(valor))) return 0;
  return Number(valor);
}

// Toast simples
function showToast(msg, time = 2000) {
  let t = document.getElementById('app-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'app-toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), time);
}

// Carregar JSON local
fetch('data/alimentos.json')
  .then(response => response.json())
  .then(dados => {
    alimentos = dados;
    preencherSelect();
    loadDietaFromStorage();
    console.log('Alimentos carregados:', alimentos.length);
  })
  .catch(err => console.error('Erro ao carregar JSON:', err));

// Preencher select
function preencherSelect() {
  const select = document.getElementById('alimento');
  if (!select) return;
  alimentos.forEach((item, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = item.description;
    select.appendChild(option);
  });
  updateAddButtonState();
}

function saveDietaToStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dieta)); } catch (e) { console.warn(e); }
}

function loadDietaFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      dieta = JSON.parse(raw);
      atualizarTabela();
      showToast('Dieta carregada do histórico');
    }
  } catch (e) { console.warn(e); }
}

// Adicionar alimento
const btnAdicionar = document.getElementById('btnAdicionar');
if (btnAdicionar) {
  btnAdicionar.addEventListener('click', () => {
    const idx = document.getElementById('alimento').value;
    const qtd = Number(document.getElementById('quantidade').value);

    if (idx === '' || qtd <= 0 || Number.isNaN(qtd)) {
      showToast('Selecione um alimento e informe a quantidade válida.');
      return;
    }

    const alimento = alimentos[Number(idx)];
    const fator = qtd / 100;

    const item = {
      nome: alimento.description,
      qtd: qtd,
      kcal: safeNumber(alimento.energy_kcal) * fator,
      carb: safeNumber(alimento.carbohydrate_g) * fator,
      prot: safeNumber(alimento.protein_g) * fator,
      lip: safeNumber(alimento.lipid_g) * fator
    };

    dieta.push(item);
    saveDietaToStorage();
    atualizarTabela();
    document.getElementById('quantidade').value = '';
    updateAddButtonState();
    showToast('Alimento adicionado');
  });
}

// Habilitar botão apenas quando válido
function updateAddButtonState() {
  const select = document.getElementById('alimento');
  const qtd = document.getElementById('quantidade');
  if (!btnAdicionar || !select || !qtd) return;
  btnAdicionar.disabled = (select.value === '' || Number(qtd.value) <= 0 || qtd.value === '');
}

const selectEl = document.getElementById('alimento');
const qtdEl = document.getElementById('quantidade');
if (selectEl) selectEl.addEventListener('input', updateAddButtonState);
if (qtdEl) {
  qtdEl.addEventListener('input', updateAddButtonState);
  qtdEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnAdicionar && btnAdicionar.click(); });
}

// Atualizar tabela e totais
function atualizarTabela() {
  const tbody = document.getElementById('tabela');
  const totais = { kcal: 0, carb: 0, prot: 0, lip: 0 };
  if (!tbody) return;

  tbody.innerHTML = '';

  if (dieta.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum alimento adicionado ainda.</td></tr>';
    document.getElementById('totais').innerHTML = '';
    return;
  }

  dieta.forEach((item, index) => {
    totais.kcal += item.kcal;
    totais.carb += item.carb;
    totais.prot += item.prot;
    totais.lip += item.lip;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.kcal.toFixed(1)}</td>
      <td>${item.carb.toFixed(1)}</td>
      <td>${item.prot.toFixed(1)}</td>
      <td>${item.lip.toFixed(1)}</td>
      <td><button class="action-btn" data-idx="${index}">Remover</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('totais').innerHTML = `
    <strong>Total:</strong><br>
    🔥 ${totais.kcal.toFixed(1)} kcal |
    🍞 ${totais.carb.toFixed(1)} g |
    🥩 ${totais.prot.toFixed(1)} g |
    🧈 ${totais.lip.toFixed(1)} g
    <br><br>
    <strong>Alimentos adicionados:</strong><br>
    ${dieta.map(i => `• ${i.nome}: ${i.qtd} g`).join('<br>')}
  `;

  // ligar eventos de remover
  document.querySelectorAll('.action-btn').forEach(btn => btn.addEventListener('click', (e) => {
    const idx = Number(e.currentTarget.getAttribute('data-idx'));
    removerItem(idx);
  }));
}

// Remover item
function removerItem(index) {
  dieta.splice(index, 1);
  saveDietaToStorage();
  atualizarTabela();
  showToast('Item removido');
}

// Inicialização: estado do botão
document.addEventListener('DOMContentLoaded', () => updateAddButtonState());

// Navegação por select (aplica-se na página index)
const calcSelect = document.getElementById('calc-select');
if (calcSelect) {
  calcSelect.addEventListener('change', (e) => {
    const v = e.target.value;
    if (v) window.location.href = v;
  });
}
