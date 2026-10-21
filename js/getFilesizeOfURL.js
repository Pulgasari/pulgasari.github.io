async function getFileSizeHead(url) {
  const res = await fetch(url, { method: 'HEAD' });
  const length = res.headers.get('content-length');
  return length ? +length : null;
}

async function getFileSizeGet(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return blob.size;
}

async function getFileSizeWithFallback(url) {
  const headSize = await getFileSizeHead(url);
  if (headSize !== null) return headSize;
  return await getFileSizeGet(url);
}
