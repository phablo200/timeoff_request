const baseUrl = process.env.HCM_BASE_URL || `http://localhost:${process.env.HCM_MOCK_PORT || 4010}`;
fetch(`${baseUrl}/admin/reset`, { method: 'POST' })
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
