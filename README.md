# 🏎️ GT7 Car Checklist

Uma checklist interativa e moderna de **todos os carros do Gran Turismo 7**, com imagens, especificações completas e progresso salvo localmente.

👉 Ideal para quem quer acompanhar a coleção no jogo sem depender de planilhas ou sites externos.

---

## ✨ Funcionalidades

- ✅ Lista completa com **559 carros** do GT7
- 🖼️ Imagens locais (thumbs) — funciona offline
- ☑️ Checklist “Tenho / Não tenho”
- 💾 Progresso salvo no **localStorage**
- 🔍 Busca por nome
- 🎛️ Filtros por:
  - Fabricante (Maker)
  - Grupo (Gr.N, Gr.3, Gr.4, etc.)
  - Tração (FR, FF, MR, RR, 4WD)
  - Aspiração (NA, TC, SC, EV)
  - Apenas os que tenho / apenas os que faltam
- 📊 Barra de progresso (% concluído)
- 🪟 Modal com:
  - Imagem grande
  - PP
  - Grupo
  - Especificações técnicas
  - Descrição / história do carro
  - Link para o site oficial do Gran Turismo

---

## 🧱 Stack utilizada

- **Frontend**
  - React + TypeScript
  - Vite
  - CSS custom (estilo racing / moderno)

- **Scraping**
  - Node.js
  - Playwright
  - Scripts próprios para:
    - Coletar dados
    - Coletar descrições
    - Baixar imagens localmente

- **Deploy**
  - GitHub Pages
  - GitHub Actions

---

## 🚀 Rodando o projeto localmente

### Pré-requisitos
- Node.js 18+
- npm

### Instalação
```bash
npm install
```

### Desenvolvimento
npm run dev

## Acesse
http://localhost:5173

### 🕷️ Atualizando os dados (scraping)
### 1️⃣ Scrapar lista + detalhes
npm run scrape:gb

### Gera
public/cars.json

### 2️⃣ Baixar imagens localmente
npm run thumbs

### Gera 
public/thumbs/*.png


### ⚠️ Observações importantes
Este projeto não é oficial e não possui vínculo com a Polyphony Digital ou Sony.
Todos os dados e imagens são utilizados apenas para fins educacionais e pessoais.
O progresso é salvo localmente no navegador (localStorage).

### 👤 Autor

Nathan Quadros da Silva
Projeto feito por paixão por carros, games e desenvolvimento.

Se curtir o projeto, ⭐ deixa uma estrela no repositório!
