'use strict';

// ===== CONSTANTS =====
const STORAGE_KEY = 'luach-moadim-events';
const APP_URL = 'https://erezdaniel7.github.io/luach-moadim';
const APP_NAME = 'לוח מועדים';
const GENERATED_BY = 'נוצר ע"י ' + APP_NAME + ' | ' + APP_URL;

const MONTHS_DATA = [
  { num: 1, name: 'תשרי', maxDays: 30 },
  { num: 2, name: 'חשון', maxDays: 30 }, // variable: 29 or 30
  { num: 3, name: 'כסלו', maxDays: 30 }, // variable: 29 or 30
  { num: 4, name: 'טבת', maxDays: 29 },
  { num: 5, name: 'שבט', maxDays: 30 },
  { num: 6, name: "אדר א'", maxDays: 30, leapOnly: true },
  { num: 7, name: 'אדר', maxDays: 29 }, // Adar B in leap years
  { num: 8, name: 'ניסן', maxDays: 30 },
  { num: 9, name: 'אייר', maxDays: 29 },
  { num: 10, name: 'סיון', maxDays: 30 },
  { num: 11, name: 'תמוז', maxDays: 29 },
  { num: 12, name: 'אב', maxDays: 30 },
  { num: 13, name: 'אלול', maxDays: 29 }
];

function getMonthName(monthNum) {
  const m = MONTHS_DATA.find(m => m.num === monthNum);
  return m ? m.name : '';
}

function getMonthMaxDays(monthNum) {
  const m = MONTHS_DATA.find(m => m.num === monthNum);
  return m ? m.maxDays : 30;
}

// ===== STATE =====
let events = [];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadEvents();
  renderEvents();
  updateYearsInfo();
  setupEventListeners();
  updateInputModeUI();
  setupTabs();
});

// ===== LOCAL STORAGE =====
function loadEvents() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    events = stored ? JSON.parse(stored) : [];
  } catch (e) {
    events = [];
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  document.getElementById('event-month').addEventListener('change', updateDayOptions);
  document.getElementById('add-event-btn').addEventListener('click', addEvent);
  document.getElementById('event-name').addEventListener('keypress', e => {
    if (e.key === 'Enter') addEvent();
  });
  document.querySelectorAll('input[name="date-input-mode"]').forEach(input => {
    input.addEventListener('change', updateInputModeUI);
  });
  document.querySelectorAll('.mode-option').forEach(option => {
    option.addEventListener('click', () => {
      const input = option.querySelector('input[name="date-input-mode"]');
      if (input && !input.checked) input.checked = true;
      updateInputModeUI();
    });
  });
  document.getElementById('event-gregorian-date').addEventListener('change', updateGregorianPreview);
  document.getElementById('after-sunset').addEventListener('change', updateGregorianPreview);
  document.getElementById('export-ics-btn').addEventListener('click', exportICS);
  document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
  document.getElementById('select-all-btn').addEventListener('click', () => {
    document.querySelectorAll('.event-checkbox').forEach(cb => cb.checked = true);
  });
  document.getElementById('deselect-all-btn').addEventListener('click', () => {
    document.querySelectorAll('.event-checkbox').forEach(cb => cb.checked = false);
  });
  document.getElementById('num-years').addEventListener('input', updateYearsInfo);
}

// ===== DAY OPTIONS =====
function updateDayOptions() {
  const monthNum = parseInt(document.getElementById('event-month').value) || 0;
  const daySelect = document.getElementById('event-day');
  const maxDays = monthNum ? getMonthMaxDays(monthNum) : 30;

  daySelect.innerHTML = '<option value="">-- בחר יום --</option>';
  for (let i = 1; i <= maxDays; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = HeDate.gimatria(i) + '  (' + i + ')';
    daySelect.appendChild(opt);
  }
}

function getSelectedInputMode() {
  const selected = document.querySelector('input[name="date-input-mode"]:checked');
  return selected ? selected.value : 'hebrew';
}

function updateInputModeUI() {
  const isHebrew = getSelectedInputMode() === 'hebrew';
  document.getElementById('hebrew-date-fields').style.display = isHebrew ? 'block' : 'none';
  document.getElementById('gregorian-date-fields').style.display = isHebrew ? 'none' : 'block';

  if (isHebrew) {
    const previewEl = document.getElementById('gregorian-conversion-preview');
    previewEl.style.display = 'none';
  } else {
    updateGregorianPreview();
  }
}

function convertGregorianToHebrew(dateValue, isAfterSunset) {
  if (!dateValue) return null;

  const [year, month, day] = dateValue.split('-').map(Number);
  if (!year || !month || !day) return null;

  const greg = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(greg.getTime())) return null;

  if (isAfterSunset) {
    greg.setDate(greg.getDate() + 1);
  }

  const hd = new HeDate(greg);
  return {
    year: hd.getYear(),
    month: hd.getMonth(),
    day: hd.getDate(),
    monthName: hd.getMonthString()
  };
}

function updateGregorianPreview() {
  const previewEl = document.getElementById('gregorian-conversion-preview');
  const gregorianInput = document.getElementById('event-gregorian-date');
  const isAfterSunset = document.getElementById('after-sunset').checked;

  if (!gregorianInput.value) {
    previewEl.textContent = '';
    previewEl.style.display = 'none';
    return;
  }

  const converted = convertGregorianToHebrew(gregorianInput.value, isAfterSunset);
  if (!converted) {
    previewEl.textContent = '';
    previewEl.style.display = 'none';
    return;
  }

  previewEl.textContent = 'יומר לתאריך עברי: ' +
    HeDate.gimatria(converted.day) + ' ' +
    converted.monthName + ' ' +
    HeDate.gimatria(converted.year);
  previewEl.style.display = 'block';
}

// ===== ADD EVENT =====
function addEvent() {
  const nameInput = document.getElementById('event-name');
  const monthSelect = document.getElementById('event-month');
  const daySelect = document.getElementById('event-day');
  const gregorianInput = document.getElementById('event-gregorian-date');
  const afterSunsetCheckbox = document.getElementById('after-sunset');
  const previewEl = document.getElementById('gregorian-conversion-preview');

  const name = nameInput.value.trim();
  const inputMode = getSelectedInputMode();
  let month = parseInt(monthSelect.value);
  let day = parseInt(daySelect.value);
  let converted = null;

  if (!name) {
    showMessage('add-message', '⚠️ אנא הזן שם לאירוע', 'error');
    nameInput.focus();
    return;
  }

  if (inputMode === 'gregorian') {
    if (!gregorianInput.value) {
      showMessage('add-message', '⚠️ אנא בחר תאריך לועזי מלא', 'error');
      gregorianInput.focus();
      return;
    }

    converted = convertGregorianToHebrew(gregorianInput.value, afterSunsetCheckbox.checked);
    if (!converted) {
      showMessage('add-message', '⚠️ לא ניתן להמיר את התאריך שנבחר', 'error');
      gregorianInput.focus();
      return;
    }

    month = converted.month;
    day = converted.day;
  } else {
    if (!month) {
      showMessage('add-message', '⚠️ אנא בחר חודש', 'error');
      monthSelect.focus();
      return;
    }
    if (!day) {
      showMessage('add-message', '⚠️ אנא בחר יום', 'error');
      daySelect.focus();
      return;
    }
  }

  const event = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    name,
    month,
    day,
    addedAt: new Date().toISOString(),
    sourceType: inputMode
  };

  if (converted) {
    event.originalGregorianDate = gregorianInput.value;
    event.afterSunset = afterSunsetCheckbox.checked;
    event.hebrewYearAtConversion = converted.year;
  }

  events.push(event);
  saveEvents();
  renderEvents();

  // Reset form
  nameInput.value = '';
  monthSelect.value = '';
  daySelect.innerHTML = '<option value="">-- בחר יום --</option>';
  gregorianInput.value = '';
  afterSunsetCheckbox.checked = false;
  previewEl.textContent = '';
  previewEl.style.display = 'none';

  const nextDate = getNextOccurrence(month, day);
  const dateStr = nextDate ? formatDisplayDate(nextDate) : '';
  const monthName = converted ? converted.monthName : getMonthName(month);
  const dayHebrew = HeDate.gimatria(day);

  let msg = `✅ האירוע "${name}" נוסף! (${dayHebrew} ${monthName})`;
  if (converted) msg += ` – הומר מתאריך לועזי`;
  if (dateStr) msg += ` – מתרחש בפעם הבאה ב‑${dateStr}`;
  showMessage('add-message', msg, 'success');
  nameInput.focus();
}

function getNextOccurrence(month, day) {
  const currentHeYear = new HeDate().getYear();
  for (let y = currentHeYear; y <= currentHeYear + 2; y++) {
    // Adar I in non-leap year → fall back to Adar (month 7)
    const actualMonth = (month === 6 && !HeDate.IsLeapYear(y)) ? 7 : month;
    const hd = new HeDate(y, actualMonth, 1);
    hd.setDate(Math.min(day, hd.getMonthLength()));
    const greg = hd.ConvertToGregorian();
    if (greg >= new Date()) return greg;
  }
  return null;
}

function formatDisplayDate(date) {
  return date.getDate().toString().padStart(2, '0') + '/' +
    (date.getMonth() + 1).toString().padStart(2, '0') + '/' +
    date.getFullYear();
}

// ===== RENDER EVENTS =====
function renderEvents() {
  const listEl = document.getElementById('events-list');
  const emptyState = document.getElementById('empty-state');
  const countEl = document.getElementById('event-count');
  const listControls = document.getElementById('list-controls');

  countEl.textContent = events.length;

  // Remove only event items — never destroy the emptyState element
  listEl.querySelectorAll('.event-item').forEach(el => el.remove());

  if (events.length === 0) {
    emptyState.style.display = 'flex';
    if (!listEl.contains(emptyState)) listEl.appendChild(emptyState);
    listControls.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  listControls.style.display = 'flex';
  events.forEach(ev => listEl.appendChild(createEventItem(ev)));
}

function createEventItem(ev) {
  const monthName = getMonthName(ev.month);
  const dayHebrew = HeDate.gimatria(ev.day);

  const item = document.createElement('div');
  item.className = 'event-item';
  item.dataset.id = ev.id;
  item.innerHTML = `
    <label class="event-checkbox-label" title="כלול בייצוא">
      <input type="checkbox" class="event-checkbox" checked>
      <span class="checkbox-custom"></span>
    </label>
    <div class="event-info">
      <div class="event-name">${escapeHtml(ev.name)}</div>
      <div class="event-date">${dayHebrew} ${monthName}</div>
    </div>
    <button class="delete-btn" data-id="${ev.id}" title="מחק אירוע">🗑️</button>
  `;
  item.querySelector('.delete-btn').addEventListener('click', () => deleteEvent(ev.id));
  return item;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ===== DELETE EVENT =====
function deleteEvent(id) {
  events = events.filter(e => e.id !== id);
  saveEvents();
  renderEvents();
}

// ===== YEARS INFO =====
function updateYearsInfo() {
  const numYears = parseInt(document.getElementById('num-years').value) || 50;
  const currentHeYear = new HeDate().getYear();
  const endHebYear = currentHeYear + numYears - 1;
  const endGregYear = new Date().getFullYear() + numYears;
  document.getElementById('years-info').textContent =
    `יוצר אירועים משנת ${HeDate.gimatria(currentHeYear)} עד ${HeDate.gimatria(endHebYear)} (עד שנת ${endGregYear} לערך)`;
}

// ===== GET SELECTED EVENTS =====
function getSelectedEvents() {
  const selected = [];
  document.querySelectorAll('.event-item').forEach(item => {
    const cb = item.querySelector('.event-checkbox');
    if (cb && cb.checked) {
      const ev = events.find(e => e.id === item.dataset.id);
      if (ev) selected.push(ev);
    }
  });
  return selected;
}

// ===== ICS EXPORT =====
function exportICS() {
  const selectedEvents = getSelectedEvents();
  if (selectedEvents.length === 0) {
    showMessage('export-message', '⚠️ אנא בחר לפחות אירוע אחד', 'error');
    return;
  }
  const numYears = parseInt(document.getElementById('num-years').value) || 50;
  const content = generateICSContent(selectedEvents, numYears);
  downloadFile(content, 'luach-moadim.ics', 'text/calendar;charset=utf-8');
  const total = selectedEvents.length * numYears;
  showMessage('export-message', `✅ הקובץ נוצר! ${selectedEvents.length} אירועים × ${numYears} שנים = ${total} תאריכים`, 'success');
}

function generateICSContent(selectedEvents, numYears) {
  const currentHeYear = new HeDate().getYear();
  const stamp = formatICSDateTime(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//לוח מועדים//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:לוח מועדים – אירועים יהודיים',
    'X-WR-CALDESC:אירועים יהודיים שנתיים – יוצר ע"י לוח מועדים'
  ];

  selectedEvents.forEach(ev => {
    const monthName = getMonthName(ev.month);

    for (let y = 0; y < numYears; y++) {
      const heYear = currentHeYear + y;

      // Adar I in non-leap year → fall back to Adar (month 7)
      const isAdarFallback = ev.month === 6 && !HeDate.IsLeapYear(heYear);
      const actualMonth = isAdarFallback ? 7 : ev.month;
      const displayMonthName = (actualMonth === 7 && HeDate.IsLeapYear(heYear)) ? "אדר ב'" :
        (actualMonth === 7) ? 'אדר' :
          monthName;

      const hd = new HeDate(heYear, actualMonth, 1);
      const monthLen = hd.getMonthLength();
      const actualDay = Math.min(ev.day, monthLen);
      const wasAdjusted = actualDay !== ev.day;

      hd.setDate(actualDay);
      const greg = hd.ConvertToGregorian();

      const dateStr = formatICSDate(greg);
      const nextDay = new Date(greg);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = formatICSDate(nextDay);

      const dayHebrew = HeDate.gimatria(actualDay);
      const yearHebrew = HeDate.gimatria(heYear);
      let hebrewDateStr = `${dayHebrew} ${displayMonthName} ${yearHebrew}`;

      let description = `תאריך עברי: ${hebrewDateStr}`;
      if (isAdarFallback) {
        description += ` (אדר א' – הוזז לאדר כי שנה זו אינה שנת עיבור)`;
      }
      if (wasAdjusted) {
        description += ` (הוזז מיום ${HeDate.gimatria(ev.day)} כי החודש קצר יותר בשנה זו)`;
      }
      description += `\n${GENERATED_BY}`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:luach-${ev.id}-${heYear}@luach-moadim`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
      lines.push(`DTEND;VALUE=DATE:${nextDayStr}`);
      lines.push(`SUMMARY:${icsEscape(ev.name)}`);
      lines.push(`DESCRIPTION:${icsEscape(description)}`);
      lines.push('TRANSP:TRANSPARENT');
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function icsEscape(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatICSDate(date) {
  return date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
}

function formatICSDateTime(date) {
  return date.getUTCFullYear().toString() +
    (date.getUTCMonth() + 1).toString().padStart(2, '0') +
    date.getUTCDate().toString().padStart(2, '0') + 'T' +
    date.getUTCHours().toString().padStart(2, '0') +
    date.getUTCMinutes().toString().padStart(2, '0') +
    date.getUTCSeconds().toString().padStart(2, '0') + 'Z';
}

// ===== CSV EXPORT =====
function exportCSV() {
  const selectedEvents = getSelectedEvents();
  if (selectedEvents.length === 0) {
    showMessage('export-message', '⚠️ אנא בחר לפחות אירוע אחד', 'error');
    return;
  }
  const numYears = parseInt(document.getElementById('num-years').value) || 50;
  const content = generateCSVContent(selectedEvents, numYears);
  downloadFile(content, 'luach-moadim.csv', 'text/csv;charset=utf-8');
  showMessage('export-message', `✅ קובץ CSV נוצר! ניתן לייבא ב-Google Calendar`, 'success');
}

function generateCSVContent(selectedEvents, numYears) {
  const currentHeYear = new HeDate().getYear();
  const rows = ['Subject,Start Date,All Day Event,Description'];

  selectedEvents.forEach(ev => {
    const monthName = getMonthName(ev.month);

    for (let y = 0; y < numYears; y++) {
      const heYear = currentHeYear + y;

      // Adar I in non-leap year → fall back to Adar (month 7)
      const isAdarFallback = ev.month === 6 && !HeDate.IsLeapYear(heYear);
      const actualMonth = isAdarFallback ? 7 : ev.month;
      const displayMonthName = (actualMonth === 7 && HeDate.IsLeapYear(heYear)) ? "אדר ב'" :
        (actualMonth === 7) ? 'אדר' :
          monthName;

      const hd = new HeDate(heYear, actualMonth, 1);
      const monthLen = hd.getMonthLength();
      const actualDay = Math.min(ev.day, monthLen);

      hd.setDate(actualDay);
      const greg = hd.ConvertToGregorian();

      const dayHebrew = HeDate.gimatria(actualDay);
      const yearHebrew = HeDate.gimatria(heYear);
      const hebrewDateStr = `${dayHebrew} ${displayMonthName} ${yearHebrew}`;

      let note = '';
      if (isAdarFallback) note = ' (אדר א\' – הוזז לאדר כי שנה זו אינה שנת עיבור)';

      const description = `תאריך עברי: ${hebrewDateStr}${note} | ${GENERATED_BY}`;

      rows.push(
        csvEscape(ev.name) + ',' +
        formatCSVDate(greg) + ',' +
        'True,' +
        csvEscape(description)
      );
    }
  });

  // UTF-8 BOM for proper Hebrew display in Excel / Google Sheets
  return '\uFEFF' + rows.join('\r\n');
}

function csvEscape(str) {
  return '"' + str.replace(/"/g, '""') + '"';
}

function formatCSVDate(date) {
  return (date.getMonth() + 1).toString().padStart(2, '0') + '/' +
    date.getDate().toString().padStart(2, '0') + '/' +
    date.getFullYear();
}

// ===== DOWNLOAD FILE =====
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== UI HELPERS =====
function showMessage(elementId, text, type) {
  const el = document.getElementById(elementId);
  el.textContent = text;
  el.className = 'message ' + type;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 7000);
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
    });
  });
}
