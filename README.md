# Clone (base) — Produtos Nike Seleção Brasileira

Layout base do clone de [Cuidado con El Perro](https://cuidadoconelperromx.site/), usado para exibir produtos da **Nike Futebol Seleção Brasileira** ([nike.com.br/sc/futebol-selecao-brasileira](https://www.nike.com.br/sc/futebol-selecao-brasileira)).

## Produtos

Os produtos exibidos vêm de `nike-produtos.json`. Ao clicar em um produto, abre-se uma página local que exibe a página do produto na Nike em iframe.

## Como atualizar os produtos Nike

```bash
npm run explorar:nike   # Extrai produtos da página Nike (Playwright)
npm run aplicar:nike    # Substitui produtos no clone por esses dados
```

## Como visualizar

```bash
npm start
# Acesse: http://localhost:3000/cuidadoconelperro/
```
