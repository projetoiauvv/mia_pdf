import assert from 'node:assert/strict';

const elements = new Map();
for (const selector of ['#jsonFile', '#generatePdf', '#status', '#chatPreview', '#messageCount']) {
  elements.set(selector, {
    value: '',
    textContent: '',
    className: '',
    disabled: false,
    children: [],
    addEventListener() {},
    replaceChildren(...children) {
      this.children = children;
    },
    innerHTML: '',
  });
}

globalThis.document = {
  querySelector(selector) {
    return elements.get(selector);
  },
  createElement() {
    return {
      className: '',
      textContent: '',
      children: [],
      append(...children) {
        this.children.push(...children);
      },
      click() {},
    };
  },
};

globalThis.URL = {
  createObjectURL() {
    return 'blob:test';
  },
  revokeObjectURL() {},
};

const {
  collectMessageRecords,
  getOutgoingAttribution,
  loadConversationPayload,
  normalizeConversation,
  parseConversationContent,
  parseTimestamp,
} = await import('../src/app.js');

const payload = [
  {
    channel: 'Whatsapp',
    messages: [
      {
        type: 'text',
        text: '> Dhiessica\n\nBom dia!',
        direction: 'OUTGOING',
        created_at: '2026-05-13 10:56:13',
      },
      {
        type: 'note_action',
        text: 'messages.inbox_assigned_to_agent',
        direction: 'OUTGOING',
        created_at: '2026-05-13 10:52:57',
      },
      {
        type: 'text',
        text: '> Claudineia\n\nNesse caso irei te transferir.',
        direction: 'OUTGOING',
        created_at: '2026-05-13 10:52:52',
      },
      {
        type: 'text',
        text: 'Mensagem sem agente',
        direction: 'OUTGOING',
        created_at: '2026-05-13 10:57:00',
      },
      {
        type: 'location',
        text: 'Universidade Vila Velha',
        direction: 'OUTGOING',
        created_at: '2026-05-13 10:58:00',
      },
      {
        type: 'image_url',
        text: 'https://example.com/foto.jpg',
        direction: 'OUTGOING',
        created_at: '2026-05-13 10:59:00',
      },
      {
        type: 'note',
        text: 'observação interna',
        direction: 'OUTGOING',
        created_at: '2026-05-13 11:00:00',
      },
      {
        type: 'text',
        text: 'Pergunta do cliente',
        direction: 'INCOMING',
        created_at: '2026-05-13 10:51:00',
      },
    ],
  },
];

assert.equal(collectMessageRecords(payload).length, 8);
assert.deepEqual(getOutgoingAttribution('> Alice\n\nOlá!'), { agentName: 'Alice', text: 'Olá!' });
assert.equal(parseTimestamp(payload[0].messages[0], 0).raw, '2026-05-13 10:56:13');

const normalized = normalizeConversation(payload);
assert.equal(normalized.messages.length, 8);
assert.equal(normalized.messages[0].label, 'Cliente');
assert.equal(normalized.messages[1].label, 'Atendente - Claudineia');
assert.equal(normalized.messages[1].text, 'Nesse caso irei te transferir.');
assert.equal(normalized.messages[2].role, 'system');
assert.equal(normalized.messages[2].variant, 'note-action');
assert.equal(normalized.messages[2].text, 'Conversa atribuida a um agente');
assert.equal(normalized.messages[3].label, 'Atendente - Dhiessica');
assert.equal(normalized.messages[4].label, 'Atendente - MIA');
assert.equal(normalized.messages[5].label, 'Atendente - MIA');
assert.equal(normalized.messages[5].text, '📍 Universidade Vila Velha');
assert.equal(normalized.messages[6].label, 'Atendente - MIA');
assert.equal(normalized.messages[6].text, '📸 Foto');
assert.equal(normalized.messages[7].role, 'system');
assert.equal(normalized.messages[7].variant, 'note');
assert.equal(normalized.messages[7].text, 'observação interna');

const concatenated = parseConversationContent(`${JSON.stringify(payload)}${JSON.stringify(payload)}`);
assert.equal(Array.isArray(concatenated), true);
assert.equal(concatenated.length, 2);

loadConversationPayload(payload);
assert.equal(elements.get('#messageCount').textContent, '8 mensagens');
assert.equal(elements.get('#generatePdf').disabled, false);
assert.equal(elements.get('#chatPreview').children.length, 8);
assert.match(elements.get('#chatPreview').children[2].className, /system/);
assert.match(elements.get('#status').textContent, /JSON carregado com 8 mensagem/);
