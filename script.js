let alimentos = [];
let dieta = [];

//  Função de segurança para números
function safeNumber(valor) {
  if (valor === "NA" || valor === "" || valor === null || valor === undefined) {
    return 0;
  }
  return Number(valor);
}

//  Carregar JSON local
fetch("data/alimentos.json")
  .then(response => response.json())
  .then(dados => {
    alimentos = dados;
    preencherSelect();
    console.log("Alimentos carregados:", alimentos.length);
  })
  .catch(err => console.error("Erro ao carregar JSON:", err));

//  Preencher select
function preencherSelect() {
  const select = document.getElementById("alimento");

  alimentos.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = item.description;
    select.appendChild(option);
  });
}

//  Adicionar alimento
document.getElementById("btnAdicionar").addEventListener("click", () => {
  const idx = document.getElementById("alimento").value;
  const qtd = Number(document.getElementById("quantidade").value);

  if (idx === "" || qtd <= 0) {
    alert("Selecione um alimento e informe a quantidade.");
    return;
  }

  const alimento = alimentos[idx];
  const fator = qtd / 100;

  const item = {
    nome: alimento.description,
    kcal: safeNumber(alimento.energy_kcal) * fator,
    carb: safeNumber(alimento.carbohydrate_g) * fator,
    prot: safeNumber(alimento.protein_g) * fator,
    lip: safeNumber(alimento.lipid_g) * fator
  };

  dieta.push(item);
  atualizarTabela();

  document.getElementById("quantidade").value = "";
});

//  Atualizar tabela e totais
function atualizarTabela() {
  const tbody = document.getElementById("tabela");
  const totais = { kcal: 0, carb: 0, prot: 0, lip: 0 };

  tbody.innerHTML = "";

  dieta.forEach((item, index) => {
    totais.kcal += item.kcal;
    totais.carb += item.carb;
    totais.prot += item.prot;
    totais.lip += item.lip;

    tbody.innerHTML += `
      <tr>
        <td>${item.nome}</td>
        <td>${item.kcal.toFixed(1)}</td>
        <td>${item.carb.toFixed(1)}</td>
        <td>${item.prot.toFixed(1)}</td>
        <td>${item.lip.toFixed(1)}</td>
        <td>
          <button onclick="removerItem(${index})">
            ❌
          </button>
        </td>
      </tr>
    `;
  });

  document.getElementById("totais").innerHTML = `
    <strong>Total:</strong><br>
    🔥 ${totais.kcal.toFixed(1)} kcal |
    🍞 ${totais.carb.toFixed(1)} g |
    🥩 ${totais.prot.toFixed(1)} g |
    🧈 ${totais.lip.toFixed(1)} g
  `;
}
function removerItem(index) {
  dieta.splice(index, 1);
  atualizarTabela();
}



