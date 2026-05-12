const state = {
  attendantName: '',
  messages: [],
};

const elements = {
  jsonFile: document.querySelector('#jsonFile'),
  sourcePayload: null,
};

const elements = {
  attendantName: document.querySelector('#attendantName'),
  jsonFile: document.querySelector('#jsonFile'),
  loadSample: document.querySelector('#loadSample'),
  generatePdf: document.querySelector('#generatePdf'),
  status: document.querySelector('#status'),
  chatPreview: document.querySelector('#chatPreview'),
  messageCount: document.querySelector('#messageCount'),
};

const sampleConversation = [
  {
    channel: 'Whatsapp',
    messages: [
      {
        type: 'note_action',
        text: 'messages.inbox_conversation_completed',
        direction: 'OUTGOING',
        created_at: '2026-05-12 10:04:00',
      },
      {
        type: 'text',
        text: '> Alice\n\nOlá! Sou a Alice. Vou verificar seu pedido agora.',
        direction: 'OUTGOING',
        created_at: '2026-05-12 10:03:00',
      },
      {
        type: 'text',
        text: 'Bom dia, gostaria de saber o status da minha entrega.',
        direction: 'INCOMING',
        created_at: '2026-05-12 10:01:00',
      },
      {
        type: 'text',
        text: 'O número do pedido é #4821.',
        direction: 'INCOMING',
        created_at: '2026-05-12 10:02:00',
      },
    ],
  },
];

function setStatus(message, type = 'default') {
  elements.status.textContent = message;
  elements.status.className = `status ${type === 'default' ? '' : type}`.trim();
}

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return String(value).trim();
}

function pickFirst(record, keys, fallback = '') {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && normalizeText(record[key]) !== '') {
      return record[key];
    }
  }

  return fallback;
}

function pickNestedName(record, keys) {
  return keys
    .map((key) => record?.[key])
    .map((value) => (value && typeof value === 'object' ? pickFirst(value, ['name', 'fullName', 'full_name', 'displayName'], '') : value))
    .map((value) => normalizeText(value))
    .find(Boolean) || '';
}

const visibleMessageTypes = new Set([
  'text',
  'message_list',
  'image',
  'audio',
  'video',
  'document',
  'file',
  'location',
  'contacts',
  'sticker',
]);

function parseConversationContent(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    const mergedTopLevelArrays = content.trim().replace(/\]\s*\[/g, ',');
    if (mergedTopLevelArrays !== content.trim()) {
      return JSON.parse(mergedTopLevelArrays);
    }

    throw error;
  }
}

const parentMetadataKeys = [
  'attendantName',
  'attendant_name',
  'agentName',
  'agent_name',
  'assigneeName',
  'assignee_name',
  'operatorName',
];

function isRecordWithMessages(record) {
  return Boolean(record && typeof record === 'object' && Array.isArray(record.messages));
}

function pickParentMetadata(record) {
  const metadata = parentMetadataKeys.reduce((values, key) => {
    if (record?.[key] !== undefined && record[key] !== null) {
      return { ...values, [key]: record[key] };
    }

    return values;
  }, {});
  const nestedName = pickNestedName(record, ['agent', 'assignee', 'operator', 'attendant', 'assigned_agent']);

  return nestedName ? { ...metadata, agentName: nestedName } : metadata;
}

function collectMessageRecords(payload) {
  if (Array.isArray(payload)) {
    const records = payload.flatMap((item) => {
      if (isRecordWithMessages(item)) {
        const metadata = pickParentMetadata(item);
        return item.messages.map((message) => ({
          ...metadata,
          ...message,
          channel: message.channel || item.channel,
        }));
        return item.messages.map((message) => ({ ...message, channel: message.channel || item.channel }));
      }

      return item;
    });

    return records;
  }

  const knownContainers = ['messages', 'conversation', 'data', 'chat', 'items', 'rows'];
  for (const key of knownContainers) {
    if (Array.isArray(payload?.[key])) {
      return collectMessageRecords(payload[key]);
    }
  }

  if (payload && typeof payload === 'object') {
    const firstArray = Object.values(payload).find(Array.isArray);
    if (firstArray) {
      return collectMessageRecords(firstArray);
    }
  }

  throw new Error('Não encontrei uma lista de mensagens no JSON.');
}

function isVisibleConversationMessage(record) {
  if (!record || typeof record !== 'object') {
    return false;
  }

  const type = normalizeText(record.type).toLowerCase();
  const text = normalizeText(pickFirst(record, ['text', 'body', 'message', 'content', 'caption', 'transcription'], ''));

  if (!text) {
    return false;
  }

  return !type || visibleMessageTypes.has(type);
}

function getOutgoingAttribution(text) {
  const match = normalizeText(text).match(/^>\s*([^\r\n]+?)\s*(?:\r?\n){2,}([\s\S]*)$/);
  if (!match) {
    return { agentName: '', text: normalizeText(text) };
  }

  return {
    agentName: normalizeText(match[1]),
    text: normalizeText(match[2]),
  };
}

function detectAttendantName(records) {
  const metadataName = records
    .map((record) => normalizeText(pickFirst(
      record,
      parentMetadataKeys,
      '',
    )) || pickNestedName(record, ['agent', 'assignee', 'operator', 'attendant', 'assigned_agent']))
    .find(Boolean);

  if (metadataName) {
    return metadataName;
function detectAttendantName(records, fallbackName) {
  const typedName = normalizeText(fallbackName);
  if (typedName) {
    return typedName;
  }

  return [...records]
    .sort((a, b) => parseTimestamp(b, 0).value - parseTimestamp(a, 0).value)
    .map((record) => {
      const direction = normalizeText(record.direction).toLowerCase();
      if (direction !== 'outgoing' && direction !== 'sent') {
        return '';
      }

      const rawText = pickFirst(record, ['text', 'body', 'message', 'content', 'caption', 'transcription'], '');
      return getOutgoingAttribution(rawText).agentName;
    })
    .find(Boolean) || 'Atendente';
}

function parseTimestamp(record, index) {
  const rawTimestamp = pickFirst(
    record,
    ['timestamp', 'createdAt', 'created_at', 'date', 'datetime', 'time', 'sentAt', 'sent_at'],
    '',
  );

  if (typeof rawTimestamp === 'number') {
    const milliseconds = rawTimestamp < 10_000_000_000 ? rawTimestamp * 1000 : rawTimestamp;
    return { raw: String(rawTimestamp), value: milliseconds };
  }

  const normalized = normalizeText(rawTimestamp);
  const localDateTime = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (localDateTime) {
    const [, year, month, day, hour, minute, second = '00'] = localDateTime;
    return {
      raw: normalized,
      value: new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).getTime(),
    };
  }

  const parsed = Date.parse(normalized);
  if (!Number.isNaN(parsed)) {
    return { raw: normalized, value: parsed };
  }

  return { raw: normalized || `sem-data-${index}`, value: Number.MAX_SAFE_INTEGER };
}

function inferRole(record, sender, attendantName) {
  const explicitRole = normalizeText(pickFirst(record, ['role', 'type', 'kind', 'participantType'], '')).toLowerCase();
  const direction = normalizeText(pickFirst(record, ['direction', 'status'], '')).toLowerCase();
  const fromMe = record.fromMe === true || record.isFromMe === true || record.mine === true;
  const senderMatchesAttendant = attendantName && sender.toLowerCase() === attendantName.toLowerCase();

  if (
    fromMe ||
    senderMatchesAttendant ||
    ['agent', 'attendant', 'atendente', 'operator', 'support', 'outgoing', 'sent'].includes(explicitRole) ||
    ['outgoing', 'sent'].includes(direction)
  ) {
    return 'agent';
  }

  return 'client';
}

function normalizeMessage(record, index, attendantName) {
  if (!record || typeof record !== 'object') {
    throw new Error(`A mensagem ${index + 1} não é um objeto válido.`);
  }

  const rawText = normalizeText(
    pickFirst(record, ['text', 'body', 'message', 'content', 'caption', 'transcription'], ''),
    '[mensagem sem texto]',
  );
  const timestamp = parseTimestamp(record, index);
  const candidateSender = normalizeText(pickFirst(record, ['sender', 'from', 'author', 'name', 'participant', 'contactName', 'pushName'], ''));
  const role = inferRole(record, candidateSender, attendantName);
  const attribution = role === 'agent' ? getOutgoingAttribution(rawText) : { agentName: '', text: rawText };
  const sender = role === 'agent'
    ? attendantName
    : normalizeText(
      pickFirst(record, ['sender', 'from', 'author', 'name', 'participant', 'contactName', 'pushName'], 'Cliente'),
      'Cliente',
    );

  return {
    id: `${timestamp.value}-${index}`,
    index,
    sender,
    label: role === 'agent' ? `Atendente - ${attendantName}` : 'Cliente',
    role,
    text: attribution.text,
    timestamp,
    type: normalizeText(record.type),
  };
}

function normalizeConversation(payload) {
  const records = collectMessageRecords(payload).filter(isVisibleConversationMessage);
  const attendantName = detectAttendantName(records);
  const attendantName = detectAttendantName(records, elements.attendantName.value);
  const messages = records
    .map((record, index) => normalizeMessage(record, index, attendantName))
    .sort((a, b) => a.timestamp.value - b.timestamp.value || a.index - b.index);

  if (messages.length === 0) {
    throw new Error('O JSON não possui mensagens de conversa para gerar o PDF. Mensagens internas como note/note_action são ignoradas.');
  }

  return { attendantName, messages };
}

function formatDateTime(timestamp) {
  if (!timestamp || !Number.isFinite(timestamp.value) || timestamp.value > Number.MAX_SAFE_INTEGER / 2) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp.value));
}

function renderPreview() {
  elements.messageCount.textContent = `${state.messages.length} mensagem${state.messages.length === 1 ? '' : 's'}`;
  elements.generatePdf.disabled = state.messages.length === 0;

  if (state.messages.length === 0) {
    elements.chatPreview.innerHTML = '<p class="empty-state">Carregue um JSON para visualizar a conversa.</p>';
    return;
  }

  elements.chatPreview.replaceChildren(
    ...state.messages.map((message) => {
      const row = document.createElement('article');
      row.className = `message-row ${message.role}`;

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';

      const label = document.createElement('span');
      label.className = 'message-label';
      label.textContent = message.label;

      const text = document.createElement('p');
      text.className = 'message-text';
      text.textContent = message.text;

      const time = document.createElement('span');
      time.className = 'message-time';
      time.textContent = formatDateTime(message.timestamp);

      bubble.append(label, text, time);
      row.append(bubble);
      return row;
    }),
  );
}

async function handleFileUpload(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    const payload = parseConversationContent(await file.text());
    const normalized = normalizeConversation(payload);
    state.attendantName = normalized.attendantName;
    state.sourcePayload = payload;
    if (!normalizeText(elements.attendantName.value)) {
      elements.attendantName.value = normalized.attendantName;
    }
    state.messages = normalized.messages;
    renderPreview();
    setStatus(`JSON carregado com ${state.messages.length} mensagem(ns), já ordenadas do mais antigo ao mais recente.`, 'success');
  } catch (error) {
    state.messages = [];
    renderPreview();
    setStatus(error.message, 'error');
  }
}

function loadSample() {
  elements.attendantName.value = '';
  const normalized = normalizeConversation(sampleConversation);
  state.attendantName = normalized.attendantName;
  state.sourcePayload = sampleConversation;
  elements.attendantName.value = normalized.attendantName;
  state.messages = normalized.messages;
  renderPreview();
  setStatus('Exemplo carregado e ordenado com sucesso.', 'success');
}

function escapePdfText(text) {
  return normalizeText(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '□')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, '\\n');
}

function estimateTextWidth(text, fontSize) {
  return normalizeText(text).length * fontSize * 0.48;
}

function wrapText(text, maxWidth, fontSize) {
  const wrapped = [];
  const paragraphs = normalizeText(text).split(/\r?\n/);

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (estimateTextWidth(candidate, fontSize) <= maxWidth) {
        line = candidate;
        continue;
      }

      if (line) {
        wrapped.push(line);
      }

      if (estimateTextWidth(word, fontSize) > maxWidth) {
        let chunk = '';
        for (const char of word) {
          if (estimateTextWidth(`${chunk}${char}`, fontSize) > maxWidth && chunk) {
            wrapped.push(chunk);
            chunk = char;
          } else {
            chunk += char;
          }
        }
        line = chunk;
      } else {
        line = word;
      }
    }

    wrapped.push(line || ' ');
  }

  return wrapped;
}

class PdfDocument {
  constructor() {
    this.width = 595.28;
    this.height = 841.89;
    this.margin = 42;
    this.pages = [];
    this.current = null;
    this.y = 0;
    this.addPage();
  }

  addPage() {
    this.current = [];
    this.pages.push(this.current);
    this.y = this.height - 116;
    this.drawPageBackground();
  }

  drawPageBackground() {
    this.rect(0, 0, this.width, this.height, 'E5DDD5');
    this.rect(0, this.height - 82, this.width, 82, '075E54');
    this.text('Conversa WhatsApp', this.margin, this.height - 36, 20, 'FFFFFF', 'Helvetica-Bold');
    this.text(`Atendente - ${state.attendantName || 'Atendente'}`, this.margin, this.height - 58, 11, 'D7F7EF');
  }

  ensureSpace(requiredHeight) {
    if (this.y - requiredHeight < 44) {
      this.addPage();
    }
  }

  rect(x, y, width, height, color) {
    this.current.push(`${(x).toFixed(2)} ${(y).toFixed(2)} ${(width).toFixed(2)} ${(height).toFixed(2)} re`);
    this.current.push(`${hexToRgb(color)} rg f`);
  }

  roundedRect(x, y, width, height, radius, color) {
    const r = Math.min(radius, width / 2, height / 2);
    const k = 0.5522847498;
    const right = x + width;
    const top = y + height;
    const c = r * k;

    this.current.push(`${hexToRgb(color)} rg`);
    this.current.push(`${(x + r).toFixed(2)} ${y.toFixed(2)} m`);
    this.current.push(`${(right - r).toFixed(2)} ${y.toFixed(2)} l`);
    this.current.push(`${(right - r + c).toFixed(2)} ${y.toFixed(2)} ${(right).toFixed(2)} ${(y + r - c).toFixed(2)} ${(right).toFixed(2)} ${(y + r).toFixed(2)} c`);
    this.current.push(`${right.toFixed(2)} ${(top - r).toFixed(2)} l`);
    this.current.push(`${right.toFixed(2)} ${(top - r + c).toFixed(2)} ${(right - r + c).toFixed(2)} ${top.toFixed(2)} ${(right - r).toFixed(2)} ${top.toFixed(2)} c`);
    this.current.push(`${(x + r).toFixed(2)} ${top.toFixed(2)} l`);
    this.current.push(`${(x + r - c).toFixed(2)} ${top.toFixed(2)} ${x.toFixed(2)} ${(top - r + c).toFixed(2)} ${x.toFixed(2)} ${(top - r).toFixed(2)} c`);
    this.current.push(`${x.toFixed(2)} ${(y + r).toFixed(2)} l`);
    this.current.push(`${x.toFixed(2)} ${(y + r - c).toFixed(2)} ${(x + r - c).toFixed(2)} ${y.toFixed(2)} ${(x + r).toFixed(2)} ${y.toFixed(2)} c f`);
  }

  text(text, x, y, size = 11, color = '1F2C34', font = 'Helvetica') {
    const fontKey = font === 'Helvetica-Bold' ? 'F2' : 'F1';
    this.current.push(`BT /${fontKey} ${size} Tf ${hexToRgb(color)} rg ${(x).toFixed(2)} ${(y).toFixed(2)} Td (${escapePdfText(text)}) Tj ET`);
  }

  message(message) {
    const fontSize = 10.5;
    const maxBubbleWidth = 360;
    const textLines = wrapText(message.text, maxBubbleWidth - 28, fontSize);
    const labelLines = wrapText(message.label, maxBubbleWidth - 28, 9);
    const time = formatDateTime(message.timestamp);
    const contentWidth = Math.max(
      ...textLines.map((line) => estimateTextWidth(line, fontSize)),
      ...labelLines.map((line) => estimateTextWidth(line, 9)),
      estimateTextWidth(time, 8),
    );
    const bubbleWidth = Math.min(maxBubbleWidth, Math.max(150, contentWidth + 28));
    const bubbleHeight = 22 + labelLines.length * 11 + textLines.length * 14 + (time ? 12 : 0);
    const x = message.role === 'agent' ? this.width - this.margin - bubbleWidth : this.margin;

    this.ensureSpace(bubbleHeight + 12);
    const y = this.y - bubbleHeight;
    this.roundedRect(x, y, bubbleWidth, bubbleHeight, 16, message.role === 'agent' ? 'DCF8C6' : 'FFFFFF');
    this.rect(x, y, bubbleWidth, bubbleHeight, message.role === 'agent' ? 'DCF8C6' : 'FFFFFF');

    let cursor = this.y - 17;
    for (const line of labelLines) {
      this.text(line, x + 12, cursor, 9, '075E54', 'Helvetica-Bold');
      cursor -= 11;
    }

    cursor -= 3;
    for (const line of textLines) {
      this.text(line, x + 12, cursor, fontSize, '1F2C34');
      cursor -= 14;
    }

    if (time) {
      this.text(time, x + bubbleWidth - estimateTextWidth(time, 8) - 12, y + 8, 8, '667781');
    }

    this.y = y - 10;
  }

  build() {
    const objects = [];
    const addObject = (body) => {
      objects.push(body);
      return objects.length;
    };

    const catalogId = addObject('');
    const pagesId = addObject('');
    const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pageIds = [];

    for (const page of this.pages) {
      const stream = page.join('\n');
      const contentId = addObject(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
      const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      pageIds.push(pageId);
    }

    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

    return createPdfBlob(objects, catalogId);
  }
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16) / 255;
  const green = parseInt(value.slice(2, 4), 16) / 255;
  const blue = parseInt(value.slice(4, 6), 16) / 255;
  return `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)}`;
}

function byteLength(text) {
  return toLatinBytes(text).length;
}

function toLatinBytes(text) {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function createPdfBlob(objects, rootId) {
  const chunks = ['%PDF-1.4\n'];
  const offsets = [0];
  let position = byteLength(chunks[0]);

  objects.forEach((object, index) => {
    offsets.push(position);
    const serialized = `${index + 1} 0 obj\n${object}\nendobj\n`;
    chunks.push(serialized);
    position += byteLength(serialized);
  });

  const xrefOffset = position;
  const xrefRows = offsets
    .map((offset, index) => (index === 0 ? '0000000000 65535 f ' : `${String(offset).padStart(10, '0')} 00000 n `))
    .join('\n');
  const trailer = `xref\n0 ${objects.length + 1}\n${xrefRows}\ntrailer\n<< /Size ${objects.length + 1} /Root ${rootId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(trailer);

  return new Blob(chunks.map(toLatinBytes), { type: 'application/pdf' });
}

function downloadPdf() {
  if (state.messages.length === 0) {
    setStatus('Carregue um JSON antes de gerar o PDF.', 'error');
    return;
  }

  const pdf = new PdfDocument();
  for (const message of state.messages) {
    pdf.message(message);
  }

  const blob = pdf.build();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const attendantSlug = normalizeText(state.attendantName, 'atendente')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  anchor.href = url;
  anchor.download = `conversa-whatsapp-${attendantSlug || 'atendente'}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus('PDF gerado com layout e ordem cronológica corrigidos.', 'success');
}

elements.jsonFile.addEventListener('change', handleFileUpload);
elements.generatePdf.addEventListener('click', downloadPdf);

elements.loadSample.addEventListener('click', loadSample);
elements.generatePdf.addEventListener('click', downloadPdf);
elements.attendantName.addEventListener('input', () => {
  if (state.messages.length === 0) {
    return;
  }

  if (!state.sourcePayload) {
    return;
  }

  const normalized = normalizeConversation(state.sourcePayload);
  state.attendantName = normalized.attendantName;
  state.messages = normalized.messages;
  renderPreview();
});

export {
  collectMessageRecords,
  getOutgoingAttribution,
  normalizeConversation,
  parseConversationContent,
  parseTimestamp,
};
