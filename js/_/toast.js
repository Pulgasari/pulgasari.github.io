// Helper to extract text from string, Error instance, or object

function extractErrorMessage (val) {
  if (val instanceof Error) {
    return val.message;
  }
  if (typeof val === 'object' && val !== null && 'message' in val && typeof val.message === 'string') {
    return val.message;
  }
  if (typeof val === 'string') {
    return val;
  }
  return String(val ?? '');
}

// toast('message')
function resolveStringShape (input) {
  if (typeof input === 'string') {
    return { text: input, type: 'normal' };
  }
  return null;
}

// toast({ text: '...', type: 'success' })
// toast({ text: '...', type: 'error' })
// toast({ text: '...', type: 'info' })
// toast({ text: '...', type: 'warn' })
function resolveStandardShape (input) {
  if (typeof input === 'object' && input !== null && 'text' in input) {
    return {
      text: input.text,
      type: input.type || 'normal',
    };
  }
  return null;
}

// toast({ success: '...' })
// toast({ error })
// Resolves shorthand shapes dynamically: toast({ success: '...' }), toast({ customType: '...' }), or toast({ error })
function resolveShorthandShape (input) {
  if (typeof input === 'object' && input !== null && !('text' in input)) {
    const keys = Object.keys(input);

    if (keys.length > 0) {
      const type = keys[0];
      return {
        text: extractErrorMessage(input[type]),
        type,
      };
    }
  }
  return null;
}


const resolvers = [
  resolveStringShape,
  resolveStandardShape,
  resolveShorthandShape,
];

// Low-level UI display trigger
function showToast (config) {
  console.log(`[${config.type.toUpperCase()}] ${config.text}`);
}

// Main toast function resolving each shape via independent resolvers
export function toast (input) {
  for (const resolve of resolvers) {
    const config = resolve(input);
    if (config) {
      showToast(config);
      return;
    }
  }

  console.warn('Unhandled toast input shape:', input);
}

/* :::::: USAGE

// String input
toast('Standard Nachricht');

// Standard shape
toast({ text: 'Erfolgreich gespeichert', type: 'success' });

// Shorthand string
toast({ success: 'Alles erledigt' });

// Catch block with Error instance
try {
  throw new Error('Verbindung fehlgeschlagen');
} catch (error) {
  toast({ error });
}
*/
