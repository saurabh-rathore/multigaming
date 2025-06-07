export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
};

// Simple template renderer (conceptual)
export const renderTemplate = (templateString: string, context: Record<string, any>): string => {
  let rendered = templateString;
  for (const key in context) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g'); // Matches {{ variableName }}
    rendered = rendered.replace(regex, String(context[key]));
  }
  // Replace any unfulfilled placeholders with a default string or remove them
  rendered = rendered.replace(/{{\s*[^}]+\s*}}/g, '[undefined_variable]');
  return rendered;
};
