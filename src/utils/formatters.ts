export function formatNumber(num: number): string {
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US').format(Math.round(num));
}

export function formatCompactNumber(num: number): string {
  if (isNaN(num)) return '0';
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'k';
  }
  return num.toString();
}

export function formatCurrency(amount: number, currency: 'USD' | 'IDR'): string {
  if (isNaN(amount)) amount = 0;
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function formatDate(isoStr?: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoStr;
  }
}

export function truncateText(text: string, maxLen = 80): string {
  if (!text) return '';
  const singleLine = text.replace(/\r?\n|\r/g, ' ').trim();
  if (singleLine.length <= maxLen) return singleLine;
  return singleLine.slice(0, maxLen).trim() + '...';
}

export function cleanPromptText(raw: string): string {
  if (!raw) return '';
  // Extract content between <USER_REQUEST> if present
  const reqMatch = raw.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i);
  let prompt = reqMatch ? reqMatch[1] : raw;

  // Remove common XML tags
  prompt = prompt.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, '');
  prompt = prompt.replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/gi, '');
  prompt = prompt.replace(/<user_information>[\s\S]*?<\/user_information>/gi, '');
  prompt = prompt.replace(/<knowledge_items>[\s\S]*?<\/knowledge_items>/gi, '');
  prompt = prompt.replace(/<conversation_transcript>[\s\S]*?<\/conversation_transcript>/gi, '');
  
  // Clean markdown mentions like @[/path/to/file] -> filename
  prompt = prompt.replace(/@\[([^\]]+)\]/g, '$1');
  prompt = prompt.replace(/@directory:([^\s]+)/g, '$1');

  return prompt.trim();
}
