const { drive: driveApi } = require('@googleapis/drive');
const { getDelegatedClient } = require('./gmail');

async function getDriveClient(subject) {
  const auth = await getDelegatedClient(subject);
  if (!auth) return null;
  return driveApi({ version: 'v3', auth });
}

async function listFilesInFolder(drive, folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, modifiedTime, owners)',
    orderBy: 'modifiedTime desc',
    pageSize: 50,
  });
  return res.data.files || [];
}

async function exportGoogleDoc(drive, fileId) {
  const res = await drive.files.export({
    fileId,
    mimeType: 'text/plain',
  });
  return typeof res.data === 'string' ? res.data : String(res.data || '');
}

module.exports = { getDriveClient, listFilesInFolder, exportGoogleDoc };
