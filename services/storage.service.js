const BUCKET = 'topics';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw { status: 500, message: 'Storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env' };
  }
  return { url, key };
};

const createSignedUploadUrl = async (fileName) => {
  const { url, key } = getSupabase();

  const res = await fetch(
    `${url}/storage/v1/object/upload/sign/${BUCKET}/${fileName}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    let msg = 'Failed to create upload URL';
    try { msg = (await res.json()).message || msg; } catch (_) {}
    throw { status: 502, message: `Storage error: ${msg}` };
  }

  const data = await res.json();

  return {
    signedUrl: `${url}${data.url}`,
    publicUrl: `${url}/storage/v1/object/public/${BUCKET}/${fileName}`,
  };
};

module.exports = { createSignedUploadUrl };
