import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000' });

export function listVMs(token) {
  return api.get('/vm/list', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getRuntimeStats(token) {
  return api.get('/vm/stats/runtime', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function stopVM(token, vmId) {
  return api.post('/vm/stop-vm',
    { vm_id: vmId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function startVM(token, vmId, includeIso) {
  return api.post('/vm/start-vm',
    { vm_id: vmId, include_iso: includeIso },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function getDiskInfo(token, name) {
  return api.post('/vm/disk-info',
    { name },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function resizeDisk(token, name, resize_by) {
  return api.post('/vm/resize-disk',
    { name, resize_by },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function convertDisk(token, source_name, source_format, target_format, target_name) {
  return api.post('/vm/convert-disk',
    { source_name, source_format, target_format, target_name },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function renameDisk(token, current_name, new_name) {
  return api.post('/vm/disk/rename',
    { current_name, new_name },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}
