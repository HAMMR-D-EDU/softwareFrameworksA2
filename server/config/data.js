const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data.json');

// In-memory data storage
const data = {
  users: [
    { id: 'u_1', username: 'super', password: '123', email: '', roles: ['super', 'super_admin'], groups: [] },
    { id: 'u_2', username: '1', password: '123', email: '', roles: ['user'], groups: [] },
    { id: 'u_3', username: '2', password: '123', email: '', roles: ['user'], groups: [] },
  ],
  groups: [],
  channels: [],
  groupInterests: [],
  reports: []
};

function loadDataFromDisk() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') { //validation checks to ensure the data is in the correct format (array)
      if (Array.isArray(parsed.users)) data.users = parsed.users;
      if (Array.isArray(parsed.groups)) data.groups = parsed.groups;
      if (Array.isArray(parsed.channels)) data.channels = parsed.channels;
      if (Array.isArray(parsed.groupInterests)) data.groupInterests = parsed.groupInterests;
      if (Array.isArray(parsed.reports)) data.reports = parsed.reports;
    }
    console.log(`✓ Loaded: ${data.users.length} users, ${data.groups.length} groups, ${data.channels.length} channels`);
  } catch (err) {
    console.error('Failed to load data.json:', err);
  }
}

function saveDataToDisk() {
  const payload = {
    users: data.users,
    groups: data.groups,
    channels: data.channels,
    groupInterests: data.groupInterests,
    reports: data.reports,
  };
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write data.json:', err);
  }
}

module.exports = { data, loadDataFromDisk, saveDataToDisk };

