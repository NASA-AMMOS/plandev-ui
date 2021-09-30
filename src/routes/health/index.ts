export async function get(): Promise<{ body: { success: boolean } }> {
  return {
    body: {
      success: true,
    },
  };
}
