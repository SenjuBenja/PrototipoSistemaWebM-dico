using Microsoft.EntityFrameworkCore;
using ProyectoPrototipoSistemaWeb.Data;

namespace ProyectoPrototipoSistemaWeb.Endpoints
{
    public static class AuthEndpoints
    {
        public record LoginRequest(string Email, string Password);

        public static RouteGroupBuilder MapAuth(this RouteGroupBuilder group)
        {
            // POST /api/auth/login
            group.MapPost("/login", async (LoginRequest req, ClinicaContext db) =>
            {
                if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                    return Results.BadRequest("Email y contraseña son requeridos.");

                var user = await db.Medicos
                    .FirstOrDefaultAsync(m => m.MedicoEmail == req.Email);

                if (user is null || (user.MedicoPassword ?? "") != req.Password)
                    return Results.Unauthorized();

                var result = new
                {
                    medicoId = user.MedicoId,
                    nombre = user.MedicoNombre,
                    apellido = user.MedicoApellido,
                    email = user.MedicoEmail
                };

                return Results.Ok(result);
            });

            return group;
        }
    }
}
