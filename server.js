
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();

// Configurações do EJS e Formulários
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true })); 

// =======================================================
// 1. CONEXÃO COM O BANCO DE DADOS (COLE SEU LINK AQUI)
// =======================================================
const MONGO_URI = 'mongodb+srv://dbsouzalucas:db_124522@cluster0.skikjpj.mongodb.net/?appName=Cluster0'; // Substitua tudo entre as aspas pelo seu link!

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Banco de Dados Conectado com Sucesso!'))
    .catch(err => console.log('❌ Erro ao conectar no Banco:', err));

// =======================================================
// 2. CONFIGURAÇÃO DA SESSÃO E MODELO DO USUÁRIO
// =======================================================
app.use(session({
    secret: 'chave-secreta-calculadora-solar-lucas', // Assinatura do crachá
    resave: false,
    saveUninitialized: false
}));

// Criando a "tabela" de Usuários no Banco de Dados
const usuarioSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true }
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

// O "Segurança" da porta: Verifica se a pessoa tem o crachá
function verificarLogin(req, res, next) {
    if (req.session.usuarioId) {
        next(); // Tem crachá, pode entrar na calculadora
    } else {
        res.redirect('/login'); // Não tem crachá, vai pra rua (tela de login)
    }
}

// =======================================================
// 3. ROTAS DE LOGIN E CADASTRO (PÚBLICAS)
// =======================================================
app.get('/login', (req, res) => res.render('login', { erro: null }));
app.get('/cadastro', (req, res) => res.render('cadastro', { erro: null }));

// Processa o Cadastro
app.post('/cadastro', async (req, res) => {
    const { email, senha } = req.body;
    
    // Verifica se o email já existe no banco
    const existe = await Usuario.findOne({ email });
    if (existe) return res.render('cadastro', { erro: 'Este e-mail já está cadastrado!' });

    // Criptografa a senha para o banco de dados não saber qual é
    const senhaCriptografada = await bcrypt.hash(senha, 10);
    
    // Salva o novo cliente
    await Usuario.create({ email, senha: senhaCriptografada });
    res.redirect('/login'); // Manda fazer login
});

// Processa o Login
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    const user = await Usuario.findOne({ email }); // Procura o usuário
    
    // Se achou o usuário E a senha bater com a criptografada
    if (user && await bcrypt.compare(senha, user.senha)) {
        req.session.usuarioId = user._id; // Entrega o crachá!
        res.redirect('/'); // Abre a porta da calculadora
    } else {
        res.render('login', { erro: 'E-mail ou senha incorretos!' });
    }
});

// Sair do sistema
app.get('/logout', (req, res) => {
    req.session.destroy(); // Rasga o crachá
    res.redirect('/login');
});


// =======================================================
// 4. A CALCULADORA (AGORA PROTEGIDA PELO SEGURANÇA)
// =======================================================
// Variáveis temporárias (Na próxima fase vamos jogar isso pro Banco também)
let equipamentos = []; 
let dadosOnGrid = null; 
const HSP = 4.2; const rendimento = 0.8; 
const opcoesBaterias = [ { tipo: 'Chumbo-Ácido 12V 100Ah', capacidadeUtil: 600 }, { tipo: 'Banco Lítio 48V 100Ah', capacidadeUtil: 3840 } ];
const opcoesPaineis = [ { modelo: 'Policristalino 330W', potenciaWp: 330 }, { modelo: 'Monocristalino 550W', potenciaWp: 550 } ];

// A rota principal agora usa o "verificarLogin" antes de deixar passar!
app.get('/', verificarLogin, (req, res) => {
    let consumoTotalOff = equipamentos.reduce((acc, eq) => acc + eq.consumoDiario, 0);
    let geracaoNecessariaOff = consumoTotalOff > 0 ? (consumoTotalOff / rendimento) : 0;
    let potenciaTelhadoOff = geracaoNecessariaOff > 0 ? (geracaoNecessariaOff / HSP) : 0;

    res.render('index', { 
        equipamentos, totalOff: consumoTotalOff, potenciaTelhadoOff, dadosOnGrid, baterias: opcoesBaterias, paineis: opcoesPaineis
    });
});

app.post('/adicionar', verificarLogin, (req, res) => {
    const { nome, potencia, horas } = req.body;
    equipamentos.push({ id: Date.now().toString(), nome, potencia: Number(potencia), horas: Number(horas), consumoDiario: Number(potencia) * Number(horas) });
    res.redirect('/');
});

app.post('/deletar/:id', verificarLogin, (req, res) => {
    equipamentos = equipamentos.filter(eq => eq.id !== req.params.id);
    res.redirect('/'); 
});

app.post('/calcular-ongrid', verificarLogin, (req, res) => {
    const { consumoMensal } = req.body;
    dadosOnGrid = { consumoMensal: Number(consumoMensal), potenciaTelhado: ((Number(consumoMensal) / 30) * 1000) / rendimento / HSP };
    res.redirect('/');
});

app.post('/limpar-ongrid', verificarLogin, (req, res) => { dadosOnGrid = null; res.redirect('/'); });

// =======================================================
// LIGA O MOTOR
// =======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor SaaS rodando na porta ${PORT}`));

