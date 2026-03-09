const express = require('express');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Bancos de dados em memória
let equipamentos = []; // Para o Off-Grid
let dadosOnGrid = null; // Para o On-Grid

const HSP = 4.2;
const rendimento = 0.8;

const opcoesBaterias = [
    { tipo: 'Chumbo-Ácido 12V 100Ah', capacidadeUtil: 600 },
    { tipo: 'Chumbo-Ácido 12V 220Ah', capacidadeUtil: 1320 },
    { tipo: 'Banco Chumbo-Ácido 24V 220Ah', capacidadeUtil: 2640 },
    { tipo: 'Banco Lítio 48V 100Ah', capacidadeUtil: 3840 }
];

const opcoesPaineis = [
    { modelo: 'Módulo Policristalino 330W', potenciaWp: 330 },
    { modelo: 'Módulo Monocristalino 550W', potenciaWp: 550 }
];

// Rota Principal
app.get('/', (req, res) => {
    // Cálculos do Off-Grid
    let consumoTotalOff = equipamentos.reduce((acc, eq) => acc + eq.consumoDiario, 0);
    let geracaoNecessariaOff = consumoTotalOff > 0 ? (consumoTotalOff / rendimento) : 0;
    let potenciaTelhadoOff = geracaoNecessariaOff > 0 ? (geracaoNecessariaOff / HSP) : 0;

    res.render('index', {
        equipamentos,
        totalOff: consumoTotalOff,
        potenciaTelhadoOff,
        dadosOnGrid, // Mandamos os dados do On-Grid para a tela também
        baterias: opcoesBaterias,
        paineis: opcoesPaineis
    });
});

// --- ROTAS OFF-GRID ---
app.post('/adicionar', (req, res) => {
    const { nome, potencia, horas } = req.body;
    equipamentos.push({
        id: Date.now().toString(),
        nome, potencia: Number(potencia), horas: Number(horas),
        consumoDiario: Number(potencia) * Number(horas)
    });
    res.redirect('/');
});

app.post('/deletar/:id', (req, res) => {
    equipamentos = equipamentos.filter(eq => eq.id !== req.params.id);
    res.redirect('/');
});

// --- ROTAS ON-GRID ---
app.post('/calcular-ongrid', (req, res) => {
    const { consumoMensal } = req.body;

    // 1. Transforma o consumo do mês (kWh) em consumo diário (Wh)
    const consumoDiarioWh = (Number(consumoMensal) / 30) * 1000;

    // 2. Aplica as perdas do sistema
    const geracaoNecessaria = consumoDiarioWh / rendimento;

    // 3. Descobre o tamanho do telhado (Wp) usando o sol da região
    const potenciaTelhado = geracaoNecessaria / HSP;

    // Salva o resultado
    dadosOnGrid = {
        consumoMensal: Number(consumoMensal),
        potenciaTelhado: potenciaTelhado
    };

    res.redirect('/');
});

app.post('/limpar-ongrid', (req, res) => {
    dadosOnGrid = null;
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));