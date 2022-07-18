export async function GET(): Promise<{ body: { success: boolean } }> {
  return {
    body: {
      success: true,
    },
  };
}
