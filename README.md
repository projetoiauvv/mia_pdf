# MIA PDF WhatsApp

Aplicativo web estático para transformar um JSON de conversa do WhatsApp em um PDF estruturado no estilo do WhatsApp.

## O que ele faz

- Recebe um arquivo `.json` com mensagens de conversa.
- Usa os próprios dados do JSON para identificar a atendente, incluindo metadados de agente/assignee ou o prefixo `> Alice\n\nMensagem` em mensagens enviadas.
- Corrige a ordem das mensagens do mais antigo para o mais recente.
- Identifica mensagens do cliente e da atendente por `direction`, `fromMe`, `isFromMe`, `role` ou campos semelhantes.
- Ignora eventos internos como `note` e `note_action`, mantendo mensagens visíveis como `text` e `message_list`.
- Remove automaticamente o prefixo de atendente antes de exibir e gerar o PDF.
- Reconhece o formato real de exportação com `[{ "channel": "Whatsapp", "messages": [...] }]`, além de listas diretas ou objetos com `messages`, `conversation`, `data`, `chat`, `items` ou `rows`.
- Corrige a ordem das mensagens do mais antigo para o mais recente.
- Identifica mensagens do cliente e da atendente por `direction`, `fromMe`, `isFromMe`, `role` ou campos semelhantes.
- Ignora eventos internos como `note` e `note_action`, mantendo mensagens visíveis como `text` e `message_list`.
- Remove automaticamente o prefixo de atendente no padrão `> Alice\n\nMensagem` antes de exibir e gerar o PDF.
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

## Exemplo de JSON

```json
[
  {
    "channel": "Whatsapp",
    "messages": [
      {
        "type": "text",
        "text": "Olá, preciso de ajuda",
        "direction": "INCOMING",
        "created_at": "2026-05-12 10:00:00"
      },
      {
        "type": "text",
        "text": "> Alice\n\nOlá! Como posso ajudar?",
        "direction": "OUTGOING",
        "created_at": "2026-05-12 10:01:00"
      },
      {
        "type": "note_action",
        "text": "messages.inbox_conversation_completed",
        "direction": "OUTGOING",
        "created_at": "2026-05-12 10:02:00"
      }
    ]
  }
]
```
