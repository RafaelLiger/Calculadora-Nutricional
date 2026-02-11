let alimentos = [];
let dieta = [];
const STORAGE_KEY = 'dieta_v1';
let selectedAlimentoIndex = null; // índice do alimento selecionado via autocomplete

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
    setupAutocomplete();
    loadDietaFromStorage();
    console.log('Alimentos carregados:', alimentos.length);
  })
  .catch(err => console.error('Erro ao carregar JSON:', err));

// Configura o autocomplete usando o array `alimentos`
function setupAutocomplete() {
  const input = document.getElementById('alimento-search');
  const suggestions = document.getElementById('alimento-suggestions');
  const hiddenIndex = document.getElementById('alimento-index');
  if (!input || !suggestions || !hiddenIndex) return;

  let cursor = -1; // índice interno para navegação via teclado

  // Acessibilidade básica para combobox
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', 'alimento-suggestions');
  suggestions.style.display = 'none';

  function renderSuggestions(list, query) {
    suggestions.innerHTML = '';
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'no-results';
      li.textContent = `Nenhum alimento encontrado para "${query}"`;
      suggestions.appendChild(li);
      suggestions.style.display = 'block';
      input.setAttribute('aria-expanded', 'true');
      return;
    }
    suggestions.style.display = 'block';
    input.setAttribute('aria-expanded', 'true');

    list.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'suggestion-item';
      li.setAttribute('role', 'option');
      li.setAttribute('data-idx', item._idx);
      li.id = `alimento-suggestion-${item._idx}`;
      li.innerHTML = `<strong>${item.description}</strong><div style="font-size:0.85rem;color:var(--muted);">${item.category || ''}</div>`;
      li.addEventListener('click', () => selectSuggestion(Number(item._idx)));
      suggestions.appendChild(li);
    });
  }

  function selectSuggestion(idx) {
    const alimento = alimentos[idx];
    if (!alimento) return;
    selectedAlimentoIndex = idx;
    hiddenIndex.value = idx;
    input.value = alimento.description;
    // marcar visualmente
    Array.from(suggestions.children).forEach(li => li.classList.remove('suggestion-item--selected'));
    const chosen = Array.from(suggestions.children).find(li => Number(li.getAttribute('data-idx')) === idx);
    if (chosen) chosen.classList.add('suggestion-item--selected');
    suggestions.innerHTML = '';
    suggestions.style.display = 'none';
    input.setAttribute('aria-expanded', 'false');
    cursor = -1;
    // mover foco para quantidade para agilizar entrada do usuário
    const qtd = document.getElementById('quantidade');
    if (qtd) qtd.focus();
    updateAddButtonState();
  }

  function clearSelection() {
    selectedAlimentoIndex = null;
    hiddenIndex.value = '';
    updateAddButtonState();
  }

  input.addEventListener('input', (e) => {
    const q = (e.target.value || '').trim().toLowerCase();
    if (q.length === 0) {
      suggestions.innerHTML = '';
      suggestions.style.display = 'none';
      input.setAttribute('aria-expanded', 'false');
      clearSelection();
      return;
    }

    // Busca eficiente: filtra por descrição (prefixo e contained), limitando resultados
    const results = [];
    const qNorm = q.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    for (let i = 0; i < alimentos.length; i++) {
      const desc = String(alimentos[i].description || '').toLowerCase();
      const descNorm = desc.normalize('NFD').replace(/\p{Diacritic}/gu, '');
      if (descNorm.includes(qNorm)) {
        results.push({ _idx: i, description: alimentos[i].description, category: alimentos[i].category });
        if (results.length >= 40) break;
      }
    }
    renderSuggestions(results, q);
  });

  // Navegação por teclado
  input.addEventListener('keydown', (e) => {
    const items = Array.from(suggestions.querySelectorAll('.suggestion-item'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cursor = Math.min(cursor + 1, items.length - 1);
      items.forEach(i => i.classList.remove('suggestion-item--highlight'));
      if (items[cursor]) items[cursor].classList.add('suggestion-item--highlight');
      // aria-activedescendant para acessibilidade
      if (items[cursor]) input.setAttribute('aria-activedescendant', items[cursor].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cursor = Math.max(cursor - 1, 0);
      items.forEach(i => i.classList.remove('suggestion-item--highlight'));
      if (items[cursor]) items[cursor].classList.add('suggestion-item--highlight');
      if (items[cursor]) input.setAttribute('aria-activedescendant', items[cursor].id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (cursor >= 0 && items[cursor]) {
        const idx = Number(items[cursor].getAttribute('data-idx'));
        selectSuggestion(idx);
      } else {
        // tentar selecionar se houver exata correspondência
        const q = input.value.trim().toLowerCase();
        const found = alimentos.findIndex(a => String(a.description || '').toLowerCase() === q);
        if (found >= 0) selectSuggestion(found);
      }
    } else if (e.key === 'Escape') {
      suggestions.innerHTML = '';
      cursor = -1;
    }
  });

  // fechar ao clicar fora
  document.addEventListener('click', (ev) => {
    if (!ev.target.closest || !ev.target.closest('.autocomplete')) {
      suggestions.innerHTML = '';
      suggestions.style.display = 'none';
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      cursor = -1;
    }
  });

  // atribui índices no dataset (melhora performance ao render)
  // já que `alimentos` pode ser grande
  for (let i = 0; i < alimentos.length; i++) alimentos[i]._idx = i;
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
    const idx = selectedAlimentoIndex;
    const qtd = Number(document.getElementById('quantidade').value);

    if (idx === null || idx === undefined || qtd <= 0 || Number.isNaN(qtd)) {
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
    // limpar seleção para evitar adicionar o mesmo item sem intenção
    const input = document.getElementById('alimento-search');
    const suggestions = document.getElementById('alimento-suggestions');
    if (input) input.value = '';
    if (suggestions) suggestions.innerHTML = '';
    selectedAlimentoIndex = null;
    updateAddButtonState();
    showToast('Alimento adicionado');
    // Em telas pequenas, rola para o bloco de totais para que o usuário veja o resultado
    scrollToResult('#totais');
  });
}

// Habilitar botão apenas quando válido
function updateAddButtonState() {
  const qtd = document.getElementById('quantidade');
  if (!btnAdicionar || !qtd) return;
  btnAdicionar.disabled = (selectedAlimentoIndex === null || Number(qtd.value) <= 0 || qtd.value === '');
}

const qtdEl = document.getElementById('quantidade');
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

  // Substitui emojis por labels/ícones (inserir SVGs em imagens/icons/ se desejar)
  document.getElementById('totais').innerHTML = `
    <strong>Total:</strong><br>
    <span class="nutri-line"><img src="imagens/icons/calories.svg" class="icon-inline" alt="kcal"> ${totais.kcal.toFixed(1)} kcal</span> |
    <span class="nutri-line"><img src="imagens/icons/carbs.svg" class="icon-inline" alt="carboidratos"> ${totais.carb.toFixed(1)} g</span> |
    <span class="nutri-line"><img src="imagens/icons/protein.svg" class="icon-inline" alt="proteínas"> ${totais.prot.toFixed(1)} g</span> |
    <span class="nutri-line"><img src="imagens/icons/fat.svg" class="icon-inline" alt="gorduras"> ${totais.lip.toFixed(1)} g
    </span>
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
document.addEventListener('DOMContentLoaded', () => {
  updateAddButtonState();
  // Certifica que o header esteja visível e sem espaço extra no topo
  const hdr = document.querySelector('header');
  if (hdr) {
    // rolamento imediato para garantir posição correta ao carregar
    hdr.scrollIntoView({ behavior: 'auto', block: 'start' });
    // foco no título para acessibilidade
    const h1 = hdr.querySelector('h1'); if (h1) h1.setAttribute('tabindex','-1'), h1.focus();
  }
  // Intercepta cliques em links "Voltar" para rolagem suave antes de navegar
  document.querySelectorAll('a.back').forEach(a => {
    a.addEventListener('click', function (e) {
      const href = a.getAttribute('href');
      if (!href) return; // nada a fazer
      e.preventDefault();
      // rola suavemente para o topo da seção antes de navegar
      const top = Math.max(document.querySelector('header')?.offsetTop || 0, 0);
      window.scrollTo({ top: top, behavior: 'smooth' });
      // navegar após breve delay (tempo para animação perceptível)
      setTimeout(() => { window.location.href = href; }, 320);
    });
  });
  // Intercepta cliques em cards que são links (navegação entre calculadoras)
  // Evita prevenir o comportamento padrão de navegação — apenas marca visualmente o card clicado.
  document.querySelectorAll('.calc-card[href]').forEach(link => {
    link.addEventListener('click', function (e) {
      document.querySelectorAll('.calc-card').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-selected','false'); });
      e.currentTarget.classList.add('active');
      e.currentTarget.setAttribute('aria-selected','true');
      // Permitir navegação nativa imediata (sem preventDefault)
    });
  });
});

// Função utilitária para casos de troca dinâmica de conteúdo: focar o header
function focusSectionHeader() {
  const hdr = document.querySelector('header');
  if (!hdr) return;
  hdr.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const h1 = hdr.querySelector('h1'); if (h1) { h1.setAttribute('tabindex','-1'); h1.focus(); }
}

// Detecta telas pequenas (mobile/tablet) - reutilizável e centralizado
function isSmallScreen() {
  return window.matchMedia('(max-width: 768px)').matches;
}

// Rolagem suave até um seletor de resultado, somente em telas pequenas.
// Garante que o elemento exista antes de rolar e foca o elemento para acessibilidade.
function scrollToResult(selector) {
  if (!isSmallScreen()) return; // aplicamos apenas para mobile/tablet
  try {
    const el = document.querySelector(selector);
    if (!el) return;
    // aguarda um frame para garantir que conteúdos síncronos tenham sido aplicados
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // foco auxiliar para leitores de tela
      const toFocus = el.querySelector('[tabindex]') || el;
      if (toFocus && typeof toFocus.focus === 'function') {
        toFocus.setAttribute('tabindex', '-1');
        toFocus.focus({ preventScroll: true });
      }
    });
  } catch (e) { console.warn('scrollToResult erro:', e); }
}

// Comportamento para os cards de seleção de calculadora (substitui <select> antigo)
// - Destaca visualmente o card ativo
// - Mantém navegação via link (cada card é um anchor para a página correspondente)
document.querySelectorAll('.calc-card').forEach(card => {
  try {
    const href = card.getAttribute('href');
    const path = window.location.pathname.split('/').pop();
    if (href && path && path === href) {
      card.classList.add('active');
      card.setAttribute('aria-selected', 'true');
    } else {
      card.setAttribute('aria-selected', 'false');
    }
    card.addEventListener('click', (e) => {
      // apenas marca visualmente (o link seguirá normalmente navegando)
      document.querySelectorAll('.calc-card').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-selected','false'); });
      e.currentTarget.classList.add('active');
      e.currentTarget.setAttribute('aria-selected','true');
    });
  } catch (err) { /* não bloquear caso elemento não seja um link */ }
});
