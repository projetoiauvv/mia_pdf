# MIA PDF WhatsApp

Aplicativo web estático para transformar um JSON de conversa do WhatsApp em um PDF estruturado no estilo do WhatsApp.

## O que ele faz

- Recebe um arquivo `.json` com mensagens de conversa.
- Usa os próprios dados do JSON para identificar a atendente, incluindo metadados de agente/assignee ou o prefixo `> Alice\n\nMensagem` em mensagens enviadas.
- Corrige a ordem das mensagens do mais antigo para o mais recente.
- Identifica mensagens do cliente e da atendente por `direction`, `fromMe`, `isFromMe`, `role` ou campos semelhantes.
- Ignora eventos internos como `note` e `note_action`, mantendo mensagens visíveis como `text` e `message_list`.
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
