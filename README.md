# MIA PDF WhatsApp

Aplicativo web estático para transformar um JSON de conversa do WhatsApp em um PDF estruturado no estilo do WhatsApp.

## O que ele faz

- Recebe um arquivo `.json` com mensagens de conversa.
- Usa o agente indicado em cada mensagem enviada pelo prefixo `> Alice\n\nMensagem`; quando não houver agente, usa `MIA`, exceto em `location` e `image_url`, que mantêm o agente anterior.
- Corrige a ordem das mensagens do mais antigo para o mais recente.
- Identifica mensagens do cliente e da atendente por `direction`, `fromMe`, `isFromMe`, `role` ou campos semelhantes.
- Mostra `note_action` como mensagem de sistema cinza, com textos conhecidos traduzidos, e `note` como mensagem centralizada amarela.
- Exibe `location` com `📍` e `image_url` como `📸 Foto`.
- Remove automaticamente o prefixo de atendente antes de exibir e gerar o PDF.
- Mostra uma prévia da conversa com bolhas no estilo WhatsApp.
- Gera um PDF localmente no navegador, com cabeçalho e rótulos `Cliente` e `Atendente - {nome da atendente}`.

## Como executar

```bash
npm start
```

Depois acesse `http://localhost:4173`.

## Como validar JavaScript

```bash
npm run check
npm test
```
