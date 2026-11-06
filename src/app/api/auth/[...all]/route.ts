// Deliberately closed until real login, email verification and shared rate limiting
// are implemented and tested on an authorized development database.
function unavailable() {
  return Response.json(
    {
      error: "AUTH_NOT_ENABLED",
      message: "La autenticación todavía no está habilitada.",
    },
    { status: 503 },
  );
}
export const GET = unavailable;
export const POST = unavailable;
