require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const app = express();
const path = require('path');

// Configurações
const PORT = process.env.PORT || 3000;
const PDF_BASE_URL = 'https://rhbahia.ba.gov.br/auditor/contracheque/file/pdf';
const PORTAL_URL = 'https://rhbahia.ba.gov.br/portal';

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Variável para controle do navegador
let activeBrowser = null;

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Proxy para PDFs (resolve CORS)
app.get('/proxy-pdf', async (req, res) => {
    try {
        const { url } = req.query;
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'Referer': 'https://rhbahia.ba.gov.br/',
                'Origin': 'https://rhbahia.ba.gov.br'
            }
        });
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="contracheque.pdf"`
        });
        res.send(response.data);
    } catch (error) {
        console.error('Erro ao buscar PDF:', error);
        res.status(500).send('Erro ao carregar PDF');
    }
});

// Rota para autenticação com navegador embutido
app.get('/login-browser', async (req, res) => {
    try {
        // Configurações do navegador
        const browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=1024,768'
            ],
            defaultViewport: {
                width: 1024,
                height: 768
            }
        });
        
        activeBrowser = browser;
        const page = await browser.newPage();
        
        // Navega para o portal específico
        await page.goto(PORTAL_URL, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        res.json({ 
            status: 'success',
            message: 'Navegador aberto no portal de login',
            url: PORTAL_URL,
            manual: false
        });

    } catch (error) {
        console.error('Erro ao iniciar navegador:', error);
        res.json({
            status: 'manual',
            message: `Não foi possível abrir o navegador automático. Por favor acesse: ${PORTAL_URL}`,
            url: PORTAL_URL,
            manual: true
        });
    }
});

// Rota para fechar o navegador
app.get('/close-browser', async (req, res) => {
    try {
        if (activeBrowser) {
            await activeBrowser.close();
            activeBrowser = null;
            res.json({ status: 'success', message: 'Navegador fechado' });
        } else {
            res.json({ status: 'error', message: 'Nenhum navegador ativo' });
        }
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: 'Erro ao fechar navegador',
            error: error.message 
        });
    }
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});