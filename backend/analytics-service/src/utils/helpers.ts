// Can use a shared generateId if needed, or events might have client-generated IDs.
// For server-assigned IDs upon storage (if not client-generated):
export const generateServerEventId = (): string => {
  // A more robust UUID generation would be used in a real app.
  return `evt_srv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};
