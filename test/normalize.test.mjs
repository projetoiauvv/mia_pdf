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
      append() {},
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
        type: 'note_action',
        text: 'messages.inbox_conversation_completed',
        direction: 'OUTGOING',
        created_at: '2026-05-12 16:58:31',
      },
      {
        type: 'text',
        text: '> Alice\n\nResposta mais nova',
        direction: 'OUTGOING',
        created_at: '2026-05-12 16:58:28',
      },
      {
        type: 'text',
        text: 'Pergunta mais antiga',
        direction: 'INCOMING',
        created_at: '2026-05-12 10:17:35',
      },
    ],
  },
];

assert.equal(collectMessageRecords(payload).length, 3);
assert.deepEqual(getOutgoingAttribution('> Alice\n\nOlá!'), { agentName: 'Alice', text: 'Olá!' });
assert.equal(parseTimestamp(payload[0].messages[2], 0).raw, '2026-05-12 10:17:35');

const normalized = normalizeConversation(payload);
assert.equal(normalized.attendantName, 'Alice');
assert.equal(normalized.messages.length, 2);
assert.equal(normalized.messages[0].text, 'Pergunta mais antiga');
assert.equal(normalized.messages[0].label, 'Cliente');
assert.equal(normalized.messages[1].text, 'Resposta mais nova');
assert.equal(normalized.messages[1].label, 'Atendente - Alice');

const concatenated = parseConversationContent(`${JSON.stringify(payload)}${JSON.stringify(payload)}`);
assert.equal(Array.isArray(concatenated), true);
assert.equal(concatenated.length, 2);


loadConversationPayload(payload);
assert.equal(elements.get('#messageCount').textContent, '2 mensagens');
assert.equal(elements.get('#generatePdf').disabled, false);
assert.equal(elements.get('#chatPreview').children.length, 2);
assert.match(elements.get('#status').textContent, /JSON carregado com 2 mensagem/);
