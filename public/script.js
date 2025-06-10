// Elementos da UI
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const loginButton = document.getElementById('loginButton');
const gerarButton = document.getElementById('gerarButton');
const loginStatus = document.getElementById('loginStatus');
const matriculaInput = document.getElementById('matricula');

// Configuração inicial
zoomValue.textContent = `${zoomSlider.value}px`;

// Event listeners
zoomSlider.addEventListener('input', updateZoom);
loginButton.addEventListener('click', abrirNavegadorLogin);
gerarButton.addEventListener('click', gerarPDFs);

// Função para atualizar o zoom
function updateZoom() {
    zoomValue.textContent = `${zoomSlider.value}px`;
    ajustarTamanhoPDFs(zoomSlider.value);
}

// Função para ajustar o tamanho dos PDFs
function ajustarTamanhoPDFs(tamanho) {
    const iframes = document.querySelectorAll('.pdf-item iframe');
    iframes.forEach(iframe => {
        iframe.style.width = `${tamanho}px`;
        iframe.style.height = `${tamanho}px`;
    });
}

// Função para abrir o navegador/login
async function abrirNavegadorLogin() {
    try {
        loginStatus.textContent = "Abrindo portal de login...";
        loginStatus.style.color = "blue";
        
        const response = await fetch('/login-browser');
        const data = await response.json();
        
        if (data.manual) {
            // Modo manual (quando o Puppeteer não está disponível)
            loginStatus.textContent = "Abrindo portal em nova aba...";
            const newWindow = window.open(data.url, '_blank');
            
            if (!newWindow || newWindow.closed) {
                const shouldRedirect = confirm(
                    'O navegador bloqueou a abertura automática. Deseja ser redirecionado agora?\n\n' +
                    'Depois de fazer login, volte para esta página.'
                );
                
                if (shouldRedirect) {
                    window.location.href = data.url;
                }
            }
            
            loginStatus.innerHTML = `Por favor, faça login no portal que foi aberto.<br>URL: <a href="${data.url}" target="_blank">${data.url}</a>`;
            loginStatus.style.color = "orange";
        } else {
            // Modo automático (Puppeteer funcionando)
            loginStatus.innerHTML = `Janela do navegador aberta com o portal.<br>Faça seu login e mantenha a janela aberta.<br>URL: <a href="${data.url}" target="_blank">${data.url}</a>`;
            loginStatus.style.color = "green";
        }
        
    } catch (error) {
        console.error('Erro ao abrir navegador:', error);
        loginStatus.textContent = "Erro ao abrir navegador. Por favor, abra manualmente o portal.";
        loginStatus.style.color = "red";
        
        // Oferece alternativa manual
        setTimeout(() => {
            if (confirm('Não foi possível abrir automaticamente. Deseja acessar o portal manualmente?')) {
                window.open('https://rhbahia.ba.gov.br/portal', '_blank');
            }
        }, 500);
    }
}

// Gerador de PDFs
let pdfCounter = 0;

async function gerarPDFs() {
    const matricula = matriculaInput.value.trim();
    const anoInicio = parseInt(document.getElementById('anoInicio').value);
    const mesInicio = parseInt(document.getElementById('mesInicio').value);
    const anoFim = parseInt(document.getElementById('anoFim').value);
    const mesFim = parseInt(document.getElementById('mesFim').value);

    const pdfContainer = document.getElementById('pdfContainer');
    pdfContainer.innerHTML = '';

    if (!matricula || isNaN(anoInicio) || isNaN(mesInicio) || isNaN(anoFim) || isNaN(mesFim)) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }

    // Mostra loading
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.textContent = 'Carregando PDFs...';
    pdfContainer.appendChild(loading);

    try {
        for (let ano = anoInicio; ano <= anoFim; ano++) {
            const mesInicioCorrigido = ano === anoInicio ? mesInicio : 1;
            const mesFimCorrigido = ano === anoFim ? mesFim : 12;

            for (let mes = mesInicioCorrigido; mes <= mesFimCorrigido; mes++) {
                const originalUrl = `${PDF_BASE_URL}/${ano}/${mes}/1/${matricula}`;
                const proxyUrl = `/proxy-pdf?url=${encodeURIComponent(originalUrl)}`;
                await criarIframe(proxyUrl, `${mes}/${ano}`);
            }
        }
    } catch (error) {
        console.error('Erro ao gerar PDFs:', error);
        alert('Erro ao carregar alguns PDFs. Verifique sua conexão e se está logado no portal.');
    } finally {
        pdfContainer.removeChild(loading);
    }
}

// Criar iframe para PDF
async function criarIframe(link, info) {
    pdfCounter++;
    const pdfContainer = document.getElementById('pdfContainer');
    
    const pdfItem = document.createElement('div');
    pdfItem.className = 'pdf-item';
    
    const pdfInfo = document.createElement('div');
    pdfInfo.className = 'pdf-info';
    pdfInfo.innerText = info;
    
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'checkbox-container';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `checkbox-${pdfCounter}`;
    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = `checkbox-${pdfCounter}`;
    checkboxLabel.innerText = "Visto";

    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(checkboxLabel);

    const iframe = document.createElement('iframe');
    iframe.src = link;
    iframe.title = "Visualizador de PDF";
    iframe.loading = "lazy";

    iframe.addEventListener('mouseenter', () => {
        pdfItem.classList.add('interacted');
    });

    iframe.addEventListener('load', () => {
        pdfItem.classList.remove('loading-pdf');
    });

    pdfItem.appendChild(pdfInfo);
    pdfItem.appendChild(iframe);
    pdfItem.appendChild(checkboxContainer);
    pdfContainer.appendChild(pdfItem);
    
    // Ajusta o tamanho inicial
    iframe.style.width = `${zoomSlider.value}px`;
    iframe.style.height = `${zoomSlider.value}px`;
}